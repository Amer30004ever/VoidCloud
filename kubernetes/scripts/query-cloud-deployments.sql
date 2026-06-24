SELECT name, status, "ipv4Address", "proxmoxVMID" FROM "CloudDeployment" WHERE status NOT IN ('DELETED') ORDER BY "createdAt" DESC LIMIT 10;
