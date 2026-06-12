import { Injectable, Logger } from '@nestjs/common';
import { randomBytes } from 'crypto';

export interface ProvisionSpec {
  hostname: string;
  cpuCores: number;
  ramMB: number;
  storageGB: number;
}

export interface ProvisionResult {
  vmid: number;
  ipv4Address: string;
  node: string;
  rootPassword: string;
}

/**
 * Proxmox API client — STUB.
 *
 * Logs the action that would be taken and returns synthesised values
 * (VMID, IP from a fake pool, root password). When real Proxmox creds
 * are configured (PROXMOX_HOST, PROXMOX_TOKEN_ID, PROXMOX_TOKEN_SECRET,
 * PROXMOX_NODE, PROXMOX_STORAGE, PROXMOX_BRIDGE, PROXMOX_IP_POOL_CIDR),
 * swap this for a real client.
 */
@Injectable()
export class ProxmoxService {
  private readonly logger = new Logger(ProxmoxService.name);
  private readonly node = process.env.PROXMOX_NODE ?? 'workernode01';
  private nextHostOctet = 50;

  isLive(): boolean {
    return Boolean(
      process.env.PROXMOX_HOST &&
        process.env.PROXMOX_TOKEN_ID &&
        process.env.PROXMOX_TOKEN_SECRET,
    );
  }

  async createContainer(spec: ProvisionSpec): Promise<ProvisionResult> {
    const vmid = 1000 + Math.floor(Math.random() * 9000);
    const ipv4Address = `10.51.100.${this.nextHostOctet++}`;
    const rootPassword = randomBytes(12).toString('base64url');

    this.logger.log(
      `[STUB] Proxmox create container: ${JSON.stringify({
        hostname: spec.hostname,
        cpuCores: spec.cpuCores,
        ramMB: spec.ramMB,
        storageGB: spec.storageGB,
      })}`,
    );
    this.logger.log(
      `[STUB] Would create container: VMID=${vmid}, IP=${ipv4Address}, node=${this.node}`,
    );

    return { vmid, ipv4Address, node: this.node, rootPassword };
  }

  async startContainer(vmid: number): Promise<void> {
    this.logger.log(`[STUB] Proxmox start container VMID=${vmid}`);
  }

  async stopContainer(vmid: number): Promise<void> {
    this.logger.log(`[STUB] Proxmox stop container VMID=${vmid}`);
  }

  async destroyContainer(vmid: number): Promise<void> {
    this.logger.log(`[STUB] Proxmox destroy container VMID=${vmid}`);
  }
}
