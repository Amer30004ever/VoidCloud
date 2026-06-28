Ops scripts for Amer-Devops-Portal

Purpose: centralize useful operational scripts for deployments, health checks, DB admin, and kubernetes troubleshooting.

Structure:
- check-endpoints.sh — verify public API endpoints
- generate-api-endpoints.sh — scan backend controllers and generate full /api/v1 route map
- kubectl-troubleshoot.sh — common kubectl debug helpers
- reset-admin-password.sh — wrapper to run the backend admin password reset
- run-all-checks.sh — run all checks in sequence

Usage:
- Unix/macOS (bash):
	- Make scripts executable: `chmod +x mind/scripts/ops/*.sh`
	- Run a single script: `./mind/scripts/ops/check-endpoints.sh`
	- Run all checks: `./mind/scripts/ops/run-all-checks.sh`

- Windows (PowerShell):
	- Open PowerShell, then run: `./mind/scripts/ops/check-endpoints.ps1`
	- Run all checks: `./mind/scripts/ops/run-all-checks.ps1`

Examples:

Run endpoint checks (bash):
```
./mind/scripts/ops/check-endpoints.sh
```

Run endpoint checks (PowerShell):
```
.\mind\scripts\ops\check-endpoints.ps1
```

Generate full backend route map (bash):
```
./mind/scripts/ops/generate-api-endpoints.sh
```

Generate full backend route map (PowerShell):
```
.\mind\scripts\ops\generate-api-endpoints.ps1
```

Reset admin password (PowerShell example):
```
$env:ADMIN_EMAIL='newadmin@mavoid.com'
$env:ADMIN_PASSWORD='NewStrongP@ss!'
.\mind\scripts\ops\reset-admin-password.ps1
```

Run without arguments to prompt for missing values:
```
.\mind\scripts\ops\reset-admin-password.ps1
```

Run with explicit option arguments:
```
.\mind\scripts\ops\reset-admin-password.ps1 -AdminEmail 'admin@example.com' -AdminPassword 'NewPass123!'
```

Security:
- Never commit plaintext credentials or real connection strings. Move them to a secret store (Kubernetes Secrets, Azure Key Vault, HashiCorp Vault, etc.).
- Use environment variables at runtime and ensure CI pipelines pass secrets via secret variables, not hard-coded values.
- Consider rotating default passwords and removing `login-cred.txt` from the repository.

Notes:
- These scripts perform basic smoke checks for the public health endpoints and a login POST path. They are not a full inventory of every backend API route in the app.
- The app contains many additional `/api/v1/...` routes beyond these checks, including auth, dashboard, cluster, crm, automation, documentation, alerts, and more.
- The reset admin password scripts now run inline Node code inside the backend pod when `kubectl` and the `voidcloud` backend deployment are available. This avoids stale fixed-path assumptions in the deployed image.
- The PowerShell scripts are safe to run on Windows and will prefer in-cluster execution (via `kubectl`) when a backend deployment is detected.
- Build artifacts and exported frontend bundles (files under `frontend/dist` and `frontend/frontend-export-*.txt`) should not be kept in source control; add them to `.gitignore` if they're present in commits.
