/**
 * Proxmox VM/CT template manifest.
 *
 * IDs map to actual templates in the Proxmox cluster. The runtime selects a
 * template per plan slug; see `getTemplateForPlan` below.
 */
export const TEMPLATE_MANIFEST = {
  9101: {
    proxmoxId: 9101,
    name: 'debian-starter',
    displayName: 'Debian 12',
    description: 'Lightweight VPS for starter plans',
    packages: [
      'curl',
      'wget',
      'git',
      'htop',
      'nethogs',
      'haveged',
      'qemu-guest-agent',
    ],
    hasDocker: false,
    minRam: 512,
    minDisk: 10,
    defaultCores: 1,
  },
  9102: {
    proxmoxId: 9102,
    name: 'ubuntu-pro',
    displayName: 'Ubuntu 22.04',
    description: 'Full-featured VPS with Docker',
    packages: [
      'curl',
      'wget',
      'git',
      'htop',
      'nethogs',
      'docker',
      'docker-compose',
      'fail2ban',
      'ufw',
      'haveged',
      'qemu-guest-agent',
    ],
    hasDocker: true,
    minRam: 1024,
    minDisk: 20,
    defaultCores: 2,
  },
  9100: {
    proxmoxId: 9100,
    name: 'alpine-free',
    displayName: 'Alpine Linux',
    description: 'Ultra-lightweight for free tier',
    packages: ['curl', 'wget', 'htop', 'openssh-server', 'tzdata'],
    hasDocker: false,
    minRam: 256,
    minDisk: 5,
    defaultCores: 1,
  },
} as const;

export type TemplateId = keyof typeof TEMPLATE_MANIFEST;

export function getTemplateForPlan(planSlug?: string | null): TemplateId {
  const slug = (planSlug ?? '').toLowerCase();
  if (slug === 'free' || slug === 'free-trial' || slug === 'alpine')
    return 9100;
  if (slug === 'pro' || slug === 'business' || slug === 'enterprise')
    return 9102;
  // starter, default, anything else
  return 9101;
}
