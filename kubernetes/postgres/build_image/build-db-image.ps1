#!/usr/bin/env pwsh

Write-Host "========================================" -ForegroundColor Blue
Write-Host "🐘 Building Custom PostgreSQL Image" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Blue
Write-Host ""

$imageName = "amer30004ever/amer-portal-postgres"
$tag = Get-Date -Format "yyyyMMdd-HHmmss"

# Step 1: Create postgres directory if not exists
if (-not (Test-Path "postgres")) {
    New-Item -ItemType Directory -Path "postgres" -Force
}

# Step 2: Create init scripts
Write-Host "Creating initialization scripts..." -ForegroundColor Yellow

@"
-- 01-init-db.sql
DO \$\$ BEGIN
    CREATE TYPE \"Role\" AS ENUM ('USER', 'ADMIN');
EXCEPTION WHEN duplicate_object THEN null;
END \$\$;

CREATE TABLE IF NOT EXISTS \"User\" (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    name TEXT,
    role \"Role\" DEFAULT 'USER',
    \"isActive\" BOOLEAN DEFAULT true,
    \"createdAt\" TIMESTAMP DEFAULT NOW(),
    \"updatedAt\" TIMESTAMP DEFAULT NOW()
);
"@ | Out-File -FilePath "postgres/01-init-db.sql" -Encoding utf8

@"
-- 02-seed-admin.sql
INSERT INTO \"User\" (id, email, password, name, role, \"isActive\") 
VALUES (
    gen_random_uuid()::text,
    'admin@amer.dev',
    '\$2b\$10\$vEM2gvnLFKt2W7BfYuYhFeIRFrRsjvwPGen8WLEBcGF7k2t46n5Fq',
    'Amer Admin',
    'ADMIN',
    true
) ON CONFLICT (email) DO NOTHING;
"@ | Out-File -FilePath "postgres/02-seed-admin.sql" -Encoding utf8

# Step 3: Create Dockerfile
@"
FROM postgres:15-alpine

ENV POSTGRES_USER=postgres
ENV POSTGRES_PASSWORD=AmerDevOps2026
ENV POSTGRES_DB=amer_portal

COPY 01-init-db.sql /docker-entrypoint-initdb.d/
COPY 02-seed-admin.sql /docker-entrypoint-initdb.d/

EXPOSE 5432
"@ | Out-File -FilePath "postgres/Dockerfile" -Encoding utf8

Write-Host "✅ Scripts created" -ForegroundColor Green

# Step 4: Build image
Write-Host ""
Write-Host "Building Docker image..." -ForegroundColor Yellow
docker build -t "$imageName:latest" -t "$imageName`:$tag" ./postgres

# Step 5: Push to Docker Hub
Write-Host ""
Write-Host "Pushing to Docker Hub..." -ForegroundColor Yellow
docker push "$imageName:latest"
docker push "$imageName`:$tag"

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "✅ Custom PostgreSQL image created!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Image name: $imageName" -ForegroundColor Cyan
Write-Host "Tags: latest, $tag" -ForegroundColor Cyan
Write-Host ""
Write-Host "To use in Docker Compose:" -ForegroundColor Yellow
Write-Host "  image: $imageName:latest" -ForegroundColor White
Write-Host ""
Write-Host "To use in Kubernetes:" -ForegroundColor Yellow
Write-Host "  image: $imageName:latest" -ForegroundColor White