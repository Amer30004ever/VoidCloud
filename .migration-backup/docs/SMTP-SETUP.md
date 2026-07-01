# Outlook SMTP setup (`nova-cloud-2026@outlook.com`)

The backend sends password-reset and verification mail through Outlook /
Office 365 SMTP. Credentials live in the Kubernetes secret **`smtp-secret`**
in the `voidcloud` namespace and are mounted into the `backend` deployment
as env vars (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`,
`EMAIL_FROM`, `FRONTEND_URL`).

## 1. Generate a Microsoft App Password

Outlook blocks plain account passwords for SMTP. You need an **App Password**:

1. Sign in at <https://account.microsoft.com/security>.
2. Make sure 2-step verification is **on** for the account.
3. Open **Advanced security options → App passwords → Create a new app password**.
4. Copy the 16-character password (no spaces). You won't see it again.

## 2. Run the setup script (recommended)

The script prompts for the App Password (hidden input), creates/replaces the
secret, runs `prisma migrate deploy`, and restarts the backend.

**Windows / PowerShell:**

```powershell
cd kubernetes
./01-Setup-SMTP.ps1
```

**Linux / macOS / WSL:**

```bash
cd kubernetes
chmod +x 01-setup-smtp.sh
./01-setup-smtp.sh
```

Override any default with a flag (PowerShell) or env var (bash):

```powershell
./01-Setup-SMTP.ps1 -SmtpUser other@outlook.com -FrontendUrl https://example.com
```

```bash
SMTP_USER=other@outlook.com FRONTEND_URL=https://example.com ./01-setup-smtp.sh
```

## 3. Manual fallback

If you can't run the scripts, the equivalent commands are:

```bash
kubectl create secret generic smtp-secret -n voidcloud \
  --from-literal=SMTP_HOST=smtp.office365.com \
  --from-literal=SMTP_PORT=587 \
  --from-literal=SMTP_USER=nova-cloud-2026@outlook.com \
  --from-literal=SMTP_PASS=<APP_PASSWORD> \
  --from-literal=EMAIL_FROM=nova-cloud-2026@outlook.com \
  --from-literal=FRONTEND_URL=https://voidcloud.cc.cd \
  --dry-run=client -o yaml | kubectl apply -f -

kubectl exec -it deployment/backend -n voidcloud -- npx prisma migrate deploy
kubectl rollout restart deployment/backend -n voidcloud
```

## 4. Verify

```bash
kubectl logs -n voidcloud deployment/backend | grep -i smtp
# expect: "SMTP transport ready (smtp.office365.com:587)"
```

Then hit **Forgot password** in the UI and confirm the reset email arrives.

## Troubleshooting

| Symptom | Fix |
|---|---|
| `535 5.7.139 Authentication unsuccessful` | App Password wrong, or basic auth disabled for the tenant. Regenerate the App Password. |
| `SMTP transport ready` logged but no email arrives | Check `suppressed_emails` table; check Outlook **Sent** folder; check recipient spam. |
| Pod still uses old creds after rotating | `kubectl rollout restart deployment/backend -n voidcloud` — env vars are read at startup. |
| Reset link points to wrong host | Update `FRONTEND_URL` in the secret and restart the backend. |
