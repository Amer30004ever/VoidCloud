# Security Incident — Credentials Exposed in Repository

**Date:** 2026-08-07
**Severity:** Critical
**Status:** Partial remediation — git history rewrite required

## Summary

Production credentials were found committed in plaintext across multiple tracked files in this repository.

## Credentials Exposed

| Credential | Files Affected | Status |
|------------|---------------|--------|
| SMTP password (`eyjm lege duuo xyei`) | `.env.example`, `k8s/voidcloud-secrets.yaml` | **Purged from tracked files** |
| Proxmox API token (`root@pam!Amer-Cloud`) | `.env.example`, `k8s/voidcloud-secrets.yaml`, `kubernetes/proxmox.env.example` | **Purged from tracked files** |
| Proxmox token secret (`c2061f36-...`) | `.env.example`, `k8s/voidcloud-secrets.yaml` | **Purged from tracked files** |
| JWT secret (`nUhchhUI6...`) | `.env.example`, `k8s/voidcloud-secrets.yaml` | **Purged from tracked files** |
| Docker Hub PAT (`dckr_pat_...`) | `.env.example` | **Purged from tracked files** |
| WhatsApp tokens/secrets | `.env.example` | **Purged from tracked files** |
| Admin email + password paste | `attached_assets/Pasted-1-fix-...txt` | **File deleted** |

## Immediate Actions Taken

1. Replaced all real secrets in tracked files with `REPLACE_WITH_*` placeholders.
2. Deleted `attached_assets/Pasted-1-fix-I-need-you-to-fix-the-following-critical-issues-i_1783097423622.txt` (contained credential paste).
3. `.env` remains gitignored; `.env.example` now contains only placeholders.

## Required Actions (Not Yet Done)

### 1. Rotate ALL exposed credentials immediately

- [ ] **Gmail SMTP** — generate new App Password at https://myaccount.google.com/apppasswords
- [ ] **Proxmox VE API token** — revoke `root@pam!Amer-Cloud` at Proxmox web UI → Datacenter → Permissions → API Tokens
- [ ] **JWT secret** — generate new secret: `openssl rand -base64 32`
- [ ] **Docker Hub PAT** — revoke at https://hub.docker.com/settings/security
- [ ] **WhatsApp Business API** — regenerate App Secret, Client Token, Access Token at https://developers.facebook.com/
- [ ] **Webhook secret** — generate new random string
- [ ] **Admin password** — change from `Admin123` to a strong password

### 2. Rewrite git history

The credentials still exist in git history. Run one of:

```bash
# Using git filter-repo (recommended)
pip install git-filter-repo
git filter-repo --replace-text <(echo 'eyjm lege duuo xyei==>REDACTED')
git filter-repo --replace-text <(echo 'c2061f36-4819-44c1-be04-f4e42b97c7d5==>REDACTED')
git filter-repo --replace-text <(echo 'root@pam!Amer-Cloud==>REDACTED')
git filter-repo --replace-text <(echo 'nUhchhUI6JNOnImTi3Y3I/lFRNrDyjwCvVIZpLkfwVY==>REDACTED')
git filter-repo --replace-text <(echo 'dckr_pat_bPnT0R3kp3jisOrapLusQNn3dHQ==>REDACTED')
git filter-repo --replace-text <(echo 'EAAK5mJYEiAwBRzHyfi2JLW8TD95LIJOn6XrkbmdUYJA88KyDEoklbZCDQZATofMuFwFZBbdh6hDZC2Kp3T49yXITgEXR0JIJOwQK0L9ZAYC5NgkANW79vQcz99jEBNaqpIaKCG8LBmg3pb1sNMEkv74D6XZC8qGYVlufkr8DhZCvKuBjgWzqV5ouMn7cmKg149EFerGA9ZAM2cJ4u15LtaRJY9TGHuPsEzKBhZC3QFpNrKc63EBQaI3V4I70uBJo26kE6WPqY6QpvNSHijgFpfAZDZD==>REDACTED')
```

Or use BFG Repo-Cleaner:
```bash
bfg --replace-text passwords.txt
git reflog expire --expire=now --all && git gc --prune=now --aggressive
git push --force
```

### 3. Enable secret scanning

- [ ] Enable GitHub Advanced Security secret scanning on this repository
- [ ] Add pre-commit hook to prevent future secret commits

### 4. Audit access logs

- [ ] Review GitHub audit log for any unauthorized access during the exposure window
- [ ] Review Proxmox, SMTP, Docker Hub, and WhatsApp API logs for suspicious activity

## Prevention

- All real secrets must live in `.env` (gitignored) or a secrets manager (Vault, AWS Secrets Manager, etc.)
- `.env.example` must contain only placeholders
- Never paste credential dumps into tracked files or `attached_assets/`
- Enable pre-commit secret scanning hooks
