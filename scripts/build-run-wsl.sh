#!/usr/bin/env bash
#
# build-run-wsl.sh — Build, run, and manage the VoidCloud portal stack
#                     via Docker Compose (inside WSL2).
#
# Usage:
#   ./scripts/build-run-wsl.sh            # Full flow: fix DNS, ensure .env,
#                                         #   build all, migrate DB, start,
#                                         #   wait for health, show status
#   ./scripts/build-run-wsl.sh -b         # Build only
#   ./scripts/build-run-wsl.sh -s         # Start only (no rebuild)
#   ./scripts/build-run-wsl.sh -x         # Stop all containers
#   ./scripts/build-run-wsl.sh -c         # Clean: stop, remove containers,
#                                         #   networks, volumes, local images
#   ./scripts/build-run-wsl.sh -l         # Show live logs after start
#   ./scripts/build-run-wsl.sh -k         # Skip waiting for infra deps
#   ./scripts/build-run-wsl.sh -h         # Show help
#
# Run from the repository root inside WSL2.

set -euo pipefail

# ── Configuration ─────────────────────────────────────────────────────
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="$ROOT/.env"
ENV_EXAMPLE="$ROOT/.env.example"
AUTH_CONTAINER="amer-devops-portal-auth-1"
MAX_RETRIES=30
RETRY_INTERVAL=2

# ── Helpers ──────────────────────────────────────────────────────────
log()  { echo -e "\033[36m[BUILD-RUN]\033[0m $*"; }
warn() { echo -e "\033[33m[WARN]\033[0m $*"; }
err()  { echo -e "\033[31m[ERROR]\033[0m $*" >&2; }
ok()   { echo -e "\033[32m[OK]\033[0m $*"; }

cd "$ROOT"

# ── Argument Parsing ──────────────────────────────────────────────────
BUILD_ONLY=false
START_ONLY=false
STOP=false
CLEAN=false
LOGS=false
SKIP_DEPS=false

usage() {
    grep '^#' "$0" | head -n 16
    exit 0
}

while getopts ":bhsxlkch" opt; do
    case "$opt" in
        b) BUILD_ONLY=true ;;
        s) START_ONLY=true ;;
        x) STOP=true ;;
        c) CLEAN=true ;;
        l) LOGS=true ;;
        k) SKIP_DEPS=true ;;
        h) usage ;;
        *) err "Unknown option: -$OPTARG"; usage ;;
    esac
done

# ── Step 0: Fix WSL2 DNS ──────────────────────────────────────────────
fix_dns() {
    log "Fixing WSL2 DNS (8.8.8.8 / 1.1.1.1) ..."
    if [ "$(id -u)" -ne 0 ]; then
        sudo bash -c "echo 'nameserver 8.8.8.8' > /etc/resolv.conf && echo 'nameserver 1.1.1.1' >> /etc/resolv.conf"
    else
        echo 'nameserver 8.8.8.8' > /etc/resolv.conf
        echo 'nameserver 1.1.1.1' >> /etc/resolv.conf
    fi
    ok "DNS fixed."
}

# ── Step 1: Ensure .env exists ────────────────────────────────────────
ensure_env() {
    if [ ! -f "$ENV_FILE" ]; then
        log "Creating .env from .env.example ..."
        if [ -f "$ENV_EXAMPLE" ]; then
            grep -E '^[A-Z_]+' "$ENV_EXAMPLE" | while IFS=$'\t' read -r key desc; do
                key="$(echo "$key" | tr -d '[:space:]')"
                [ -n "$key" ] && echo "$key=" >> "$ENV_FILE"
            done
            # Override SMTP_PASS with dev default
            if grep -q '^SMTP_PASS=' "$ENV_FILE" 2>/dev/null; then
                sed -i 's/^SMTP_PASS=.*/SMTP_PASS=test-smtp-pass-for-local-dev/' "$ENV_FILE"
            else
                echo "SMTP_PASS=test-smtp-pass-for-local-dev" >> "$ENV_FILE"
            fi
        else
            warn ".env.example not found; creating minimal .env"
            echo "SMTP_PASS=test-smtp-pass-for-local-dev" > "$ENV_FILE"
        fi
        ok "Created .env"
    else
        log ".env already exists."
    fi

    # Always ensure SMTP_PASS is set (auth service requires it at startup)
    if ! grep -q '^SMTP_PASS=' "$ENV_FILE"; then
        echo "SMTP_PASS=test-smtp-pass-for-local-dev" >> "$ENV_FILE"
    fi
}

# ── Step 2: Docker daemon check ───────────────────────────────────────
check_docker() {
    log "Checking Docker daemon ..."
    if ! docker info >/dev/null 2>&1; then
        err "Docker daemon not reachable. Try:  sudo dockerd &"
        exit 1
    fi
    ok "Docker is running."
}

# ── Step 3: Build images ──────────────────────────────────────────────
build_images() {
    log "Building all service images ..."
    docker compose build
    ok "All images built."
}

# ── Step 4: Start infrastructure containers first ─────────────────────────
start_infra() {
    log "Starting infrastructure (postgres, redis, rabbitmq) ..."
    docker compose up -d postgres redis rabbitmq

    log "Waiting for infrastructure to be healthy ..."
    sleep 5
    for i in $(seq 1 $MAX_RETRIES); do
        if docker compose exec -T postgres pg_isready -U postgres >/dev/null 2>&1; then
            ok "Postgres is ready."
            break
        fi
        [ "$i" -eq "$MAX_RETRIES" ] && warn "Postgres did not become ready."
        sleep "$RETRY_INTERVAL"
    done
    sleep 3
}

# ── Step 5: Start application containers ─────────────────────────────────
start_apps() {
    log "Starting all application containers ..."
    docker compose up -d --skip-deps auth user tenant vps billing crm whatsapp email notification monitoring audit analytics sub2api agent frontend
    ok "Application containers started."
}

# ── Step 5: Run database migrations/sync ──────────────────────────────
run_migrations() {
    log "Running Prisma schema sync (db push) ..."
    if docker compose ps --format '{{.Names}}' | grep -q "$AUTH_CONTAINER"; then
        docker exec "$AUTH_CONTAINER" npx prisma db push --schema=./prisma/schema.prisma 2>&1 || warn "Prisma db push may have issues (non-fatal)."
        ok "DB schema synced."
    else
        warn "Auth container not found; skipping DB sync."
    fi
}

# ── Step 6: Wait for auth service ─────────────────────────────────────
wait_for_auth() {
    log "Waiting for auth service (localhost:3001/api/v1/health) ..."
    for i in $(seq 1 $MAX_RETRIES); do
        local code
        code=$(curl -s -o /dev/null -w '%{http_code}' http://localhost:3001/api/v1/health 2>/dev/null || true)
        if [ "$code" = "200" ]; then
            ok "Auth service is healthy (HTTP 200)."
            return 0
        fi
        sleep "$RETRY_INTERVAL"
    done
    warn "Auth service did not become healthy in $MAX_RETRIES attempts."
}

# ── Step 7: Wait for frontend ─────────────────────────────────────────
wait_for_frontend() {
    log "Waiting for frontend (localhost:3000/voidcloud) ..."
    for i in $(seq 1 $MAX_RETRIES); do
        local code
        code=$(curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/voidcloud 2>/dev/null || true)
        if [ "$code" = "200" ]; then
            ok "Frontend is healthy (HTTP 200)."
            return 0
        fi
        sleep "$RETRY_INTERVAL"
    done
    warn "Frontend did not become healthy in $MAX_RETRIES attempts."
}

# ── Step 8: Show status ───────────────────────────────────────────────
show_status() {
    echo ""
    log "=== SERVICE STATUS ==="
    docker compose ps --format 'table {{.Name}}\t{{.Status}}\t{{.Ports}}'
    echo ""
    log "=== QUICK TESTS ==="
    local auth_resp
    auth_resp=$(curl -s http://localhost:3001/api/v1/health 2>/dev/null || echo "unreachable")
    echo "  Auth     (localhost:3001): $auth_resp"
    local fe_code
    fe_code=$(curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/voidcloud 2>/dev/null || echo "000")
    echo "  Frontend (localhost:3000): HTTP $fe_code"
}

# ── Step 9: Show logs ─────────────────────────────────────────────────
show_logs() {
    if [ "$LOGS" = true ]; then
        echo ""
        log "=== CONTAINER LOGS (Ctrl+C to exit) ==="
        docker compose logs --follow --tail=50
    fi
}

# ── Step 10: Stop ─────────────────────────────────────────────────────
stop_containers() {
    log "Stopping all containers ..."
    docker compose stop
    ok "Stopped."
}

# ── Step 11: Clean ────────────────────────────────────────────────────
clean_stack() {
    log "Stopping and removing all containers, networks, volumes, and local images ..."
    docker compose down -v --rmi local --remove-orphans
    ok "Reset complete."
}

# ── Main ──────────────────────────────────────────────────────────────

# Handle simple commands first
if [ "$STOP" = true ];  then stop_containers; exit 0; fi
if [ "$CLEAN" = true ]; then clean_stack;    exit 0; fi

fix_dns
ensure_env
check_docker

if [ "$BUILD_ONLY" = true ]; then
    build_images
    exit 0
fi

if [ "$START_ONLY" = true ]; then
    start_infra
    run_migrations
    start_apps
    wait_for_auth
    wait_for_frontend
    show_status
    show_logs
    exit 0
fi

# Full flow
build_images
start_infra
run_migrations
start_apps
wait_for_auth
wait_for_frontend
show_status
show_logs
