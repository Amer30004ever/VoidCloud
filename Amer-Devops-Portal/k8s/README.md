# VoidCloud Kubernetes Manifests

Apply in this order:

```bash
# 1. Namespace + Secrets (fix postgres CreateContainerConfigError first)
kubectl apply -f k8s/voidcloud-secrets.yaml

# 2. Fix postgres deployment
kubectl apply -f k8s/postgres-fix.yaml

# 3. Consolidated Ingress (replaces ingress.yaml + ingress-tls.yaml)
kubectl apply -f k8s/ingress.yaml

# 4. Cloudflare Tunnel as K8s Deployment
#    — FIRST fill in your tunnel token:
#      Copy it from your systemd command:
#        /usr/local/bin/cloudflared --no-autoupdate tunnel run --token <TOKEN>
#    — Edit cloudflare-tunnel.yaml and replace REPLACE_WITH_YOUR_TUNNEL_TOKEN
#    — Then stop the systemd service:
#        sudo systemctl stop cloudflared
#        sudo systemctl disable cloudflared
kubectl apply -f k8s/cloudflare-tunnel.yaml
```

## After applying

Delete the old ingress files from your Git repo:
```bash
git rm ingress-tls.yaml ingress.yaml
```

## Architecture

```
Cloudflare → cloudflared (K8s, 2 replicas) → frontend:3000 / auth:3001 (ClusterIP)
                                           ↘ Traefik Ingress (for internal routing)
```

cloudflared now runs **inside** the cluster pointing directly to ClusterIP services,
eliminating NodePort dependency and the systemd service on workernode01.

## Monitoring endpoints (cluster-internal)

| Service       | URL                                                    |
|---------------|--------------------------------------------------------|
| Prometheus    | prometheus-operated.monitoring.svc.cluster.local:9090  |
| Grafana       | grafana.monitoring.svc.cluster.local:3000              |
| AlertManager  | alertmanager-operated.monitoring.svc.cluster.local:9093|
| Loki          | loki.monitoring.svc.cluster.local:3100                 |

VoidCloud proxies these through `/api/monitoring/<service>/...` Next.js API routes.
No extra Ingress needed for monitoring — it's all server-side from the frontend pod.
