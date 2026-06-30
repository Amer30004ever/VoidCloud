"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var ProxmoxService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProxmoxService = void 0;
const common_1 = require("@nestjs/common");
const crypto_1 = require("crypto");
const https = __importStar(require("https"));
const template_manifest_1 = require("./template-manifest");
let ProxmoxService = ProxmoxService_1 = class ProxmoxService {
    constructor() {
        this.logger = new common_1.Logger(ProxmoxService_1.name);
        this.nodes = (process.env.PROXMOX_NODES ||
            process.env.PROXMOX_NODE ||
            'workernode01')
            .split(',')
            .map((n) => n.trim())
            .filter(Boolean);
        this.node = this.nodes[0];
        this.storage = process.env.PROXMOX_STORAGE ?? 'local-lvm';
        this.bridge = process.env.PROXMOX_BRIDGE ?? 'vmbr0';
        this.template = process.env.PROXMOX_TEMPLATE ??
            'local:vztmpl/ubuntu-22.04-standard_22.04-1_amd64.tar.zst';
        this.gateway = process.env.PROXMOX_GATEWAY ?? '';
        this.ipBase = (process.env.PROXMOX_IP_POOL_CIDR ?? '10.51.100.0/24')
            .split('/')[0]
            .split('.')
            .slice(0, 3)
            .join('.');
        this.nextHostOctet = Number(process.env.PROXMOX_IP_POOL_START || 50);
        this.inFlightIps = new Set();
        this.agent = new https.Agent({
            rejectUnauthorized: process.env.PROXMOX_VERIFY_TLS !== 'false',
        });
    }
    isLive() {
        return Boolean(process.env.PROXMOX_HOST &&
            process.env.PROXMOX_TOKEN_ID &&
            process.env.PROXMOX_TOKEN_SECRET);
    }
    nodeTemplateConfig(node, templateId) {
        const upper = node.toUpperCase().replace(/[^A-Z0-9]/g, '_');
        return {
            storage: process.env[`PROXMOX_STORAGE_${upper}`] ?? this.storage,
            bridge: process.env[`PROXMOX_BRIDGE_${upper}`] ?? this.bridge,
            ostemplate: process.env[`PROXMOX_TEMPLATE_${templateId}`] ?? this.template,
        };
    }
    async pickNode() {
        if (this.nodes.length === 1)
            return this.nodes[0];
        try {
            const stats = await this.pveRequest('GET', `/nodes`);
            const online = (stats ?? []).filter((n) => this.nodes.includes(n.node) && n.status === 'online');
            if (!online.length)
                return this.nodes[0];
            online.sort((a, b) => {
                const aLoad = (a.cpu ?? 0) + (a.mem ?? 0) / (a.maxmem || 1);
                const bLoad = (b.cpu ?? 0) + (b.mem ?? 0) / (b.maxmem || 1);
                return aLoad - bLoad;
            });
            this.logger.log(`Selected least-loaded node: ${online[0].node}`);
            return online[0].node;
        }
        catch (e) {
            this.logger.warn(`Node selection fallback (${e.message}); using ${this.nodes[0]}`);
            return this.nodes[0];
        }
    }
    get baseUrl() {
        const host = process.env.PROXMOX_HOST;
        return host.startsWith('http') ? host : `https://${host}`;
    }
    headers() {
        return {
            Authorization: `PVEAPIToken=${process.env.PROXMOX_TOKEN_ID}=${process.env.PROXMOX_TOKEN_SECRET}`,
            'Content-Type': 'application/x-www-form-urlencoded',
        };
    }
    async pveRequest(method, path, params) {
        let url = `${this.baseUrl}/api2/json${path}`;
        let body;
        if (params && Object.keys(params).length > 0) {
            const qs = new URLSearchParams(Object.entries(params)
                .filter(([, v]) => v !== undefined && v !== null)
                .map(([k, v]) => [k, String(v)])).toString();
            if (method === 'GET' || method === 'DELETE') {
                url += `?${qs}`;
            }
            else {
                body = qs;
            }
        }
        const headers = { ...this.headers() };
        if (body) {
            headers['Content-Length'] = String(Buffer.byteLength(body));
        }
        const options = {
            method,
            headers,
            agent: this.agent,
        };
        return new Promise((resolve, reject) => {
            const req = https.request(url, options, (res) => {
                let data = '';
                res.on('data', (chunk) => (data += chunk));
                res.on('end', () => {
                    if (!res.statusCode || res.statusCode >= 400) {
                        reject(new common_1.ServiceUnavailableException(`Proxmox ${method} ${path} → ${res.statusCode} ${data.slice(0, 200)}`));
                        return;
                    }
                    try {
                        const json = JSON.parse(data);
                        resolve(json?.data);
                    }
                    catch (e) {
                        reject(new common_1.ServiceUnavailableException(`Failed to parse Proxmox response: ${e}`));
                    }
                });
            });
            req.on('error', reject);
            if (body)
                req.write(body);
            req.end();
        });
    }
    async allocateIp() {
        const used = new Set(Array.from(this.inFlightIps).map((ip) => Number(ip.split('.')[3])));
        try {
            for (const node of this.nodes) {
                const list = await this.pveRequest('GET', `/nodes/${node}/lxc`).catch(() => []);
                for (const ct of list ?? []) {
                    try {
                        const cfg = await this.pveRequest('GET', `/nodes/${node}/lxc/${ct.vmid}/config`);
                        const ip = String(cfg.net0 ?? '').match(/ip=([\d.]+)/)?.[1];
                        if (ip?.startsWith(this.ipBase + '.'))
                            used.add(Number(ip.split('.')[3]));
                    }
                    catch {
                    }
                }
            }
        }
        catch (e) {
            this.logger.warn(`IP allocation fallback (could not list CTs): ${e.message}`);
        }
        while (used.has(this.nextHostOctet))
            this.nextHostOctet++;
        if (this.nextHostOctet > 254)
            throw new common_1.ServiceUnavailableException('IP pool exhausted');
        const ip = `${this.ipBase}.${this.nextHostOctet++}`;
        this.inFlightIps.add(ip);
        return ip;
    }
    async createContainer(spec) {
        const rootPassword = (0, crypto_1.randomBytes)(12).toString('base64url');
        const templateId = spec.templateId ?? (0, template_manifest_1.getTemplateForPlan)(spec.planSlug);
        const template = template_manifest_1.TEMPLATE_MANIFEST[templateId];
        this.logger.log(`Provisioning request: plan=${spec.planSlug ?? 'n/a'} template=${templateId} (${template.displayName}) ` +
            `hostname=${spec.hostname} cpu=${spec.cpuCores} ram=${spec.ramMB}MB disk=${spec.storageGB}GB`);
        if (!this.isLive()) {
            const vmid = 1000 + Math.floor(Math.random() * 9000);
            const ipv4Address = `${this.ipBase}.${this.nextHostOctet++}`;
            this.logger.log(`[STUB] proxmox clone template=${templateId} → vmid=${vmid} ip=${ipv4Address}`);
            return { vmid, ipv4Address, node: this.node, rootPassword };
        }
        const targetNode = await this.pickNode();
        const cfg = this.nodeTemplateConfig(targetNode, templateId);
        const nextId = await this.pveRequest('GET', `/cluster/nextid`);
        const vmid = Number(nextId);
        const ipv4Address = await this.allocateIp();
        const cores = Math.max(1, Math.ceil(spec.cpuCores));
        const params = {
            vmid,
            hostname: spec.hostname
                .toLowerCase()
                .replace(/[^a-z0-9-]/g, '-')
                .slice(0, 60),
            ostemplate: cfg.ostemplate,
            cores,
            memory: spec.ramMB,
            swap: Math.max(256, Math.floor(spec.ramMB / 2)),
            rootfs: `${cfg.storage}:${spec.storageGB}`,
            net0: `name=eth0,bridge=${cfg.bridge},ip=${ipv4Address}/24${this.gateway ? `,gw=${this.gateway}` : ''}`,
            password: rootPassword,
            unprivileged: 1,
            onboot: 1,
            start: 1,
            features: 'nesting=1',
        };
        try {
            await this.pveRequest('POST', `/nodes/${targetNode}/lxc`, params);
        }
        catch (e) {
            this.inFlightIps.delete(ipv4Address);
            throw e;
        }
        this.logger.log(`Proxmox created LXC vmid=${vmid} ip=${ipv4Address} node=${targetNode} template=${templateId}`);
        return { vmid, ipv4Address, node: targetNode, rootPassword };
    }
    async startContainer(vmid, node = this.node) {
        if (!this.isLive()) {
            this.logger.log(`[STUB] start vmid=${vmid}`);
            return;
        }
        await this.pveRequest('POST', `/nodes/${node}/lxc/${vmid}/status/start`);
    }
    async stopContainer(vmid, node = this.node) {
        if (!this.isLive()) {
            this.logger.log(`[STUB] stop vmid=${vmid}`);
            return;
        }
        await this.pveRequest('POST', `/nodes/${node}/lxc/${vmid}/status/shutdown`);
    }
    async rebootContainer(vmid, node = this.node) {
        if (!this.isLive()) {
            this.logger.log(`[STUB] reboot vmid=${vmid}`);
            return;
        }
        await this.pveRequest('POST', `/nodes/${node}/lxc/${vmid}/status/reboot`);
    }
    async destroyContainer(vmid, node = this.node) {
        if (!this.isLive()) {
            this.logger.log(`[STUB] destroy vmid=${vmid}`);
            return;
        }
        try {
            await this.pveRequest('POST', `/nodes/${node}/lxc/${vmid}/status/shutdown`, { forceStop: 1 });
        }
        catch {
            try {
                await this.pveRequest('POST', `/nodes/${node}/lxc/${vmid}/status/stop`);
            }
            catch {
            }
        }
        await this.pveRequest('DELETE', `/nodes/${node}/lxc/${vmid}`, {
            purge: 1,
            'destroy-unreferenced-disks': 1,
        });
    }
    async resizeContainer(vmid, spec, node = this.node) {
        if (!this.isLive()) {
            this.logger.log(`[STUB] resize vmid=${vmid} ${JSON.stringify(spec)}`);
            return;
        }
        const cfg = {};
        if (spec.cpuCores)
            cfg.cores = Math.max(1, Math.ceil(spec.cpuCores));
        if (spec.ramMB) {
            cfg.memory = spec.ramMB;
            cfg.swap = Math.max(256, Math.floor(spec.ramMB / 2));
        }
        if (Object.keys(cfg).length)
            await this.pveRequest('PUT', `/nodes/${node}/lxc/${vmid}/config`, cfg);
        if (spec.storageGB) {
            await this.pveRequest('PUT', `/nodes/${node}/lxc/${vmid}/resize`, {
                disk: 'rootfs',
                size: `${spec.storageGB}G`,
            });
        }
    }
    async reinstallContainer(vmid, spec, ipv4, node = this.node) {
        const rootPassword = (0, crypto_1.randomBytes)(12).toString('base64url');
        if (!this.isLive()) {
            this.logger.log(`[STUB] reinstall vmid=${vmid}`);
            return { rootPassword };
        }
        const templateId = spec.templateId ?? (0, template_manifest_1.getTemplateForPlan)(spec.planSlug);
        const cfg = this.nodeTemplateConfig(node, templateId);
        await this.destroyContainer(vmid, node);
        await this.pveRequest('POST', `/nodes/${node}/lxc`, {
            vmid,
            hostname: spec.hostname,
            ostemplate: cfg.ostemplate,
            cores: Math.max(1, Math.ceil(spec.cpuCores)),
            memory: spec.ramMB,
            swap: Math.max(256, Math.floor(spec.ramMB / 2)),
            rootfs: `${cfg.storage}:${spec.storageGB}`,
            net0: `name=eth0,bridge=${cfg.bridge},ip=${ipv4}/24${this.gateway ? `,gw=${this.gateway}` : ''}`,
            password: rootPassword,
            unprivileged: 1,
            onboot: 1,
            start: 1,
            features: 'nesting=1',
        });
        return { rootPassword };
    }
    async setRootPassword(vmid, node = this.node) {
        const rootPassword = (0, crypto_1.randomBytes)(12).toString('base64url');
        if (!this.isLive()) {
            this.logger.log(`[STUB] set-root-pw vmid=${vmid}`);
            return { rootPassword };
        }
        await this.pveRequest('PUT', `/nodes/${node}/lxc/${vmid}/config`, {
            password: rootPassword,
        });
        return { rootPassword };
    }
    async getStatus(vmid, node = this.node) {
        if (!this.isLive()) {
            return {
                status: 'running',
                cpuPercent: Math.round(Math.random() * 40),
                memUsedMB: 256,
                memTotalMB: 1024,
                diskUsedGB: 2,
                diskTotalGB: 20,
                uptimeSec: 3600,
                netIn: 0,
                netOut: 0,
            };
        }
        const s = await this.pveRequest('GET', `/nodes/${node}/lxc/${vmid}/status/current`);
        return {
            status: (s.status ?? 'unknown'),
            cpuPercent: Math.round((s.cpu ?? 0) * 100),
            memUsedMB: Math.round((s.mem ?? 0) / 1024 / 1024),
            memTotalMB: Math.round((s.maxmem ?? 0) / 1024 / 1024),
            diskUsedGB: Math.round(((s.disk ?? 0) / 1024 / 1024 / 1024) * 10) / 10,
            diskTotalGB: Math.round(((s.maxdisk ?? 0) / 1024 / 1024 / 1024) * 10) / 10,
            uptimeSec: s.uptime ?? 0,
            netIn: s.netin ?? 0,
            netOut: s.netout ?? 0,
        };
    }
    async listClusterNodes() {
        if (!this.isLive()) {
            return this.nodes.map((n, i) => ({
                name: n,
                currentLoad: Math.round((0.2 + i * 0.15 + Math.random() * 0.1) * 100) / 100,
                online: true,
            }));
        }
        try {
            const list = await this.pveRequest('GET', `/nodes`);
            return (list ?? []).map((n) => ({
                name: n.node,
                currentLoad: Math.round(((n.cpu ?? 0) + (n.mem ?? 0) / (n.maxmem || 1)) * 50) /
                    100,
                online: n.status === 'online',
            }));
        }
        catch {
            return this.nodes.map((n) => ({
                name: n,
                currentLoad: 0,
                online: false,
            }));
        }
    }
    async listClusterStorage() {
        if (!this.isLive()) {
            return [
                {
                    name: this.storage,
                    available: 500_000_000_000,
                    total: 1_000_000_000_000,
                    node: this.nodes[0],
                },
            ];
        }
        try {
            const out = [];
            for (const node of this.nodes) {
                const list = await this.pveRequest('GET', `/nodes/${node}/storage`).catch(() => []);
                for (const s of list ?? []) {
                    out.push({
                        name: s.storage,
                        available: Number(s.avail ?? 0),
                        total: Number(s.total ?? 0),
                        node,
                    });
                }
            }
            return out;
        }
        catch {
            return [];
        }
    }
    async startContainerMigration(sourceNode, vmid, targetNode, targetStorage) {
        if (!this.isLive())
            return null;
        const params = {
            target: targetNode,
            online: 1,
            restart: 1,
        };
        if (targetStorage)
            params['target-storage'] = targetStorage;
        return this.pveRequest('POST', `/nodes/${sourceNode}/lxc/${vmid}/migrate`, params);
    }
    async getTaskStatus(node, upid) {
        if (!this.isLive())
            return { status: 'stopped', exitstatus: 'OK', progress: 100 };
        const s = await this.pveRequest('GET', `/nodes/${node}/tasks/${encodeURIComponent(upid)}/status`);
        return { status: s.status, exitstatus: s.exitstatus, progress: s.progress };
    }
    async stopTask(node, upid) {
        if (!this.isLive())
            return;
        await this.pveRequest('DELETE', `/nodes/${node}/tasks/${encodeURIComponent(upid)}`);
    }
};
exports.ProxmoxService = ProxmoxService;
exports.ProxmoxService = ProxmoxService = ProxmoxService_1 = __decorate([
    (0, common_1.Injectable)()
], ProxmoxService);
//# sourceMappingURL=proxmox.service.js.map