import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { randomBytes } from 'crypto';

export interface ControlPanelDefinition {
  id: string;
  name: string;
  description: string;
  priceUSD: number; // monthly add-on price
  defaultPort: number;
  pathSuffix: string;
  installCommand: string;
}

export const CONTROL_PANELS: ControlPanelDefinition[] = [
  {
    id: 'none',
    name: 'None',
    description: 'No control panel — SSH only.',
    priceUSD: 0,
    defaultPort: 0,
    pathSuffix: '',
    installCommand: '',
  },
  {
    id: '1panel',
    name: '1Panel',
    description: 'Modern open-source server & app panel.',
    priceUSD: 0,
    defaultPort: 30000,
    pathSuffix: '/entrance',
    installCommand: 'curl -sSL https://resource.1panel.pro/quick_start.sh | bash',
  },
  {
    id: 'cockpit',
    name: 'Cockpit',
    description: 'Lightweight web-based server management.',
    priceUSD: 0,
    defaultPort: 9090,
    pathSuffix: '',
    installCommand: 'apt-get install -y cockpit && systemctl enable --now cockpit.socket',
  },
  {
    id: 'cpanel',
    name: 'cPanel',
    description: 'Industry standard hosting control panel.',
    priceUSD: 15,
    defaultPort: 2083,
    pathSuffix: '',
    installCommand: 'cd /home && curl -o latest -L https://securedownloads.cpanel.net/latest && sh latest',
  },
  {
    id: 'plesk',
    name: 'Plesk',
    description: 'Popular all-in-one hosting control panel.',
    priceUSD: 12,
    defaultPort: 8443,
    pathSuffix: '',
    installCommand: 'sh <(curl https://autoinstall.plesk.com/one-click-installer || wget -O - https://autoinstall.plesk.com/one-click-installer)',
  },
  {
    id: 'cyberpanel',
    name: 'CyberPanel',
    description: 'OpenLiteSpeed-based hosting panel.',
    priceUSD: 0,
    defaultPort: 8090,
    pathSuffix: '',
    installCommand: 'sh <(curl https://cyberpanel.net/install.sh || wget -O - https://cyberpanel.net/install.sh)',
  },
];

@Injectable()
export class VpsPanelService {
  constructor(private prisma: PrismaService) {}

  list() {
    return CONTROL_PANELS.map(({ installCommand: _ic, ...rest }) => rest);
  }

  private getPanel(id: string) {
    const panel = CONTROL_PANELS.find((p) => p.id === id);
    if (!panel) throw new BadRequestException(`Unknown control panel: ${id}`);
    return panel;
  }

  private async ensureOwnership(userId: string, vpsId: string) {
    const vps = await this.prisma.cloudDeployment.findUnique({
      where: { id: vpsId },
    });
    if (!vps) throw new NotFoundException('VPS not found');
    if (vps.userId !== userId) throw new ForbiddenException();
    return vps;
  }

  async install(userId: string, vpsId: string, panelId: string) {
    const vps = await this.ensureOwnership(userId, vpsId);
    const panel = this.getPanel(panelId);

    if (panel.id === 'none') {
      const updated = await this.prisma.cloudDeployment.update({
        where: { id: vpsId },
        data: {
          controlPanel: 'none',
          controlPanelStatus: 'NONE',
          controlPanelUrl: null,
          controlPanelUser: null,
          controlPanelPassword: null,
          controlPanelInstalledAt: null,
        },
      });
      return this.toStatus(updated);
    }

    // Stub: real implementation would SSH to the VPS and run panel.installCommand.
    const host = vps.ipv4Address ?? vps.hostname ?? 'pending';
    const url = `https://${host}:${panel.defaultPort}${panel.pathSuffix}`;
    const user = 'admin';
    const password = randomBytes(9).toString('base64url');

    const updated = await this.prisma.cloudDeployment.update({
      where: { id: vpsId },
      data: {
        controlPanel: panel.id,
        controlPanelStatus: 'INSTALLED',
        controlPanelUrl: url,
        controlPanelUser: user,
        controlPanelPassword: password,
        controlPanelInstalledAt: new Date(),
      },
    });
    return this.toStatus(updated);
  }

  async status(userId: string, vpsId: string) {
    const vps = await this.ensureOwnership(userId, vpsId);
    return this.toStatus(vps);
  }

  private toStatus(vps: {
    controlPanel: string | null;
    controlPanelStatus: string | null;
    controlPanelUrl: string | null;
    controlPanelUser: string | null;
    controlPanelPassword: string | null;
    controlPanelInstalledAt: Date | null;
  }) {
    return {
      panel: vps.controlPanel ?? 'none',
      status: vps.controlPanelStatus ?? 'NOT_INSTALLED',
      url: vps.controlPanelUrl,
      user: vps.controlPanelUser,
      password: vps.controlPanelPassword,
      installedAt: vps.controlPanelInstalledAt,
    };
  }
}
