# Kubernetes manifests

Apply order is handled by CI/CD (`.gitlab-ci.yml` / `.github/workflows/ci-cd.yaml`).

```
namespace.yaml → secrets.yaml → configmaps.yaml
→ postgres/ redis/ rabbitmq/
→ cloudflare-tunnel-config.yaml ingress.yaml
→ auth/ user/ tenant/ vps/ billing/ crm/ openwa/
→ email/ notification/ monitoring/ audit/ analytics/ sub2api/ frontend/
→ migrate-job.yaml
```

Do not add manual deploy scripts here. Use CI only.
