export declare const TEMPLATE_MANIFEST: {
    readonly 9101: {
        readonly proxmoxId: 9101;
        readonly name: "debian-starter";
        readonly displayName: "Debian 12";
        readonly description: "Lightweight VPS for starter plans";
        readonly packages: readonly ["curl", "wget", "git", "htop", "nethogs", "haveged", "qemu-guest-agent"];
        readonly hasDocker: false;
        readonly minRam: 512;
        readonly minDisk: 10;
        readonly defaultCores: 1;
    };
    readonly 9102: {
        readonly proxmoxId: 9102;
        readonly name: "ubuntu-pro";
        readonly displayName: "Ubuntu 22.04";
        readonly description: "Full-featured VPS with Docker";
        readonly packages: readonly ["curl", "wget", "git", "htop", "nethogs", "docker", "docker-compose", "fail2ban", "ufw", "haveged", "qemu-guest-agent"];
        readonly hasDocker: true;
        readonly minRam: 1024;
        readonly minDisk: 20;
        readonly defaultCores: 2;
    };
    readonly 9100: {
        readonly proxmoxId: 9100;
        readonly name: "alpine-free";
        readonly displayName: "Alpine Linux";
        readonly description: "Ultra-lightweight for free tier";
        readonly packages: readonly ["curl", "wget", "htop", "openssh-server", "tzdata"];
        readonly hasDocker: false;
        readonly minRam: 256;
        readonly minDisk: 5;
        readonly defaultCores: 1;
    };
};
export type TemplateId = keyof typeof TEMPLATE_MANIFEST;
export declare function getTemplateForPlan(planSlug?: string | null): TemplateId;
