# Generates kubernetes deployment+service manifests for Void Cloud microservices
$services = @(
  @{ Name = "tenant"; Port = 3003; Env = @("DATABASE_URL","JWT_SECRET","REDIS_HOST","REDIS_PORT") },
  @{ Name = "vps"; Port = 3004; Env = @("DATABASE_URL","JWT_SECRET","PROXMOX_HOST","PROXMOX_TOKEN_ID","PROXMOX_TOKEN_SECRET","PROXMOX_NODE","PROXMOX_STORAGE","PROXMOX_BRIDGE","PROXMOX_IP_POOL_CIDR","PROXMOX_GATEWAY","REDIS_HOST","REDIS_PORT","RABBITMQ_HOST","RABBITMQ_PORT") },
  @{ Name = "billing"; Port = 3005; Env = @("DATABASE_URL","JWT_SECRET","REDIS_HOST","REDIS_PORT","RABBITMQ_HOST","RABBITMQ_PORT") },
  @{ Name = "crm"; Port = 3006; Env = @("DATABASE_URL","JWT_SECRET","REDIS_HOST","REDIS_PORT") },
  @{ Name = "whatsapp"; Port = 3007; Env = @("DATABASE_URL","JWT_SECRET","WHATSAPP_APP_ID","WHATSAPP_APP_SECRET","WHATSAPP_CLIENT_TOKEN","WHATSAPP_ACCESS_TOKEN","WHATSAPP_PHONE_NUMBER_ID","WHATSAPP_WABA_ID","WHATSAPP_VERIFY_TOKEN","WEBHOOK_SECRET","WHATSAPP_SUPPORT_NUMBER","WHATSAPP_SUPPORT_NUMBER_FORMATTED","WHATSAPP_WEBHOOK_URL","REDIS_HOST","REDIS_PORT","RABBITMQ_HOST","RABBITMQ_PORT") },
  @{ Name = "email"; Port = 3008; Env = @("SMTP_HOST","SMTP_PORT","SMTP_USER","SMTP_PASS","EMAIL_FROM","RABBITMQ_HOST","RABBITMQ_PORT") },
  @{ Name = "notification"; Port = 3009; Env = @("REDIS_HOST","REDIS_PORT","RABBITMQ_HOST","RABBITMQ_PORT") },
  @{ Name = "monitoring"; Port = 3010; Env = @("DATABASE_URL","REDIS_HOST","REDIS_PORT") },
  @{ Name = "audit"; Port = 3011; Env = @("DATABASE_URL","RABBITMQ_HOST","RABBITMQ_PORT") },
  @{ Name = "analytics"; Port = 3012; Env = @("DATABASE_URL","REDIS_HOST","REDIS_PORT") }
)

$secretKeys = @("DATABASE_URL","JWT_SECRET","PROXMOX_HOST","PROXMOX_TOKEN_ID","PROXMOX_TOKEN_SECRET","PROXMOX_NODE","PROXMOX_STORAGE","PROXMOX_BRIDGE","PROXMOX_IP_POOL_CIDR","PROXMOX_GATEWAY","SMTP_HOST","SMTP_PORT","SMTP_USER","SMTP_PASS","EMAIL_FROM","WHATSAPP_APP_ID","WHATSAPP_APP_SECRET","WHATSAPP_CLIENT_TOKEN","WHATSAPP_ACCESS_TOKEN","WHATSAPP_PHONE_NUMBER_ID","WHATSAPP_WABA_ID","WHATSAPP_VERIFY_TOKEN","WEBHOOK_SECRET","WHATSAPP_SUPPORT_NUMBER","WHATSAPP_SUPPORT_NUMBER_FORMATTED","WHATSAPP_WEBHOOK_URL")
$configKeys = @("NODE_ENV","REDIS_HOST","REDIS_PORT","RABBITMQ_HOST","RABBITMQ_PORT")

foreach ($svc in $services) {
  $dir = "kubernetes/$($svc.Name)"
  New-Item -ItemType Directory -Force -Path $dir | Out-Null
  $envYaml = @()
  $envYaml += "        - name: NODE_ENV`n          valueFrom:`n            configMapKeyRef:`n              name: voidcloud-config`n              key: NODE_ENV"
  $envYaml += "        - name: PORT`n          value: `"$($svc.Port)`""
  foreach ($key in $svc.Env) {
    if ($secretKeys -contains $key) {
      $envYaml += "        - name: $key`n          valueFrom:`n            secretKeyRef:`n              name: voidcloud-secrets`n              key: $key"
    } elseif ($configKeys -contains $key) {
      $envYaml += "        - name: $key`n          valueFrom:`n            configMapKeyRef:`n              name: voidcloud-config`n              key: $key"
    }
  }
  $envBlock = $envYaml -join "`n"
  $deploy = @"
apiVersion: apps/v1
kind: Deployment
metadata:
  name: $($svc.Name)-service
  namespace: voidcloud
  labels:
    app: $($svc.Name)-service
spec:
  replicas: 2
  selector:
    matchLabels:
      app: $($svc.Name)-service
  template:
    metadata:
      labels:
        app: $($svc.Name)-service
    spec:
      containers:
      - name: $($svc.Name)-service
        image: docker.io/voidcloud/$($svc.Name)-service:latest
        imagePullPolicy: Always
        ports:
        - containerPort: $($svc.Port)
        env:
$envBlock
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: $($svc.Port)
          initialDelaySeconds: 30
          periodSeconds: 10
"@
  $service = @"
apiVersion: v1
kind: Service
metadata:
  name: $($svc.Name)-service
  namespace: voidcloud
spec:
  selector:
    app: $($svc.Name)-service
  ports:
  - port: $($svc.Port)
    targetPort: $($svc.Port)
  type: ClusterIP
"@
  Set-Content -Path "$dir/deployment.yaml" -Value $deploy
  Set-Content -Path "$dir/service.yaml" -Value $service
}
Write-Output "Generated $($services.Count) K8s manifest pairs"
