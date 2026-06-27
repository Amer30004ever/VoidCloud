Ops scripts for Amer-Devops-Portal

Purpose: centralize useful operational scripts for deployments, health checks, DB admin, and kubernetes troubleshooting.

Structure:
- check-endpoints.sh — verify public API endpoints
- kubectl-troubleshoot.sh — common kubectl debug helpers
- reset-admin-password.sh — wrapper to run the backend admin password reset
- run-all-checks.sh — run all checks in sequence

Usage:
- Unix/macOS (bash):
	- Make scripts executable: `chmod +x scripts/ops/*.sh`
	- Run a single script: `./scripts/ops/check-endpoints.sh`
	- Run all checks: `./scripts/ops/run-all-checks.sh`

- Windows (PowerShell):
	- Open PowerShell, then run: `./scripts/ops/check-endpoints.ps1`
	- Run all checks: `./scripts/ops/run-all-checks.ps1`

Examples:

Run endpoint checks (bash):
```
./scripts/ops/check-endpoints.sh
```

Run endpoint checks (PowerShell):
```
.\scripts\ops\check-endpoints.ps1
```

Reset admin password (in-cluster, PowerShell example):
```
$env:ADMIN_EMAIL='newadmin@mavoid.com'
$env:ADMIN_PASSWORD='NewStrongP@ss!'
.\scripts\ops\reset-admin-password.ps1
```

Security:
- Never commit plaintext credentials or real connection strings. Move them to a secret store (Kubernetes Secrets, Azure Key Vault, HashiCorp Vault, etc.).
- Use environment variables at runtime and ensure CI pipelines pass secrets via secret variables, not hard-coded values.
- Consider rotating default passwords and removing `login-cred.txt` from the repository.

Notes:
- The PowerShell scripts are safe to run on Windows and will prefer in-cluster execution (via `kubectl`) when a backend deployment is detected.
- Build artifacts and exported frontend bundles (files under `frontend/dist` and `frontend/frontend-export-*.txt`) should not be kept in source control; add them to `.gitignore` if they're present in commits.
