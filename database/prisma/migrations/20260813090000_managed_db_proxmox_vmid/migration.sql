-- Track the Proxmox LXC container backing each managed database instance.
ALTER TABLE "managed_databases" ADD COLUMN IF NOT EXISTS "proxmoxVmid" INTEGER;
