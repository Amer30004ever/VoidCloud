import { type TemplateId } from './template-manifest';
export interface ProvisionSpec {
    hostname: string;
    cpuCores: number;
    ramMB: number;
    storageGB: number;
    planSlug?: string;
    templateId?: TemplateId;
}
export interface ProvisionResult {
    vmid: number;
    ipv4Address: string;
    node: string;
    rootPassword: string;
}
export interface ContainerStatus {
    status: 'running' | 'stopped' | 'paused' | 'unknown';
    cpuPercent: number;
    memUsedMB: number;
    memTotalMB: number;
    diskUsedGB: number;
    diskTotalGB: number;
    uptimeSec: number;
    netIn: number;
    netOut: number;
}
export declare class ProxmoxService {
    private readonly logger;
    private readonly nodes;
    private readonly node;
    private readonly storage;
    private readonly bridge;
    private readonly template;
    private readonly gateway;
    private readonly ipBase;
    private nextHostOctet;
    private readonly inFlightIps;
    private readonly agent;
    isLive(): boolean;
    private nodeTemplateConfig;
    private pickNode;
    private get baseUrl();
    private headers;
    private pveRequest;
    private allocateIp;
    createContainer(spec: ProvisionSpec): Promise<ProvisionResult>;
    startContainer(vmid: number, node?: string): Promise<void>;
    stopContainer(vmid: number, node?: string): Promise<void>;
    rebootContainer(vmid: number, node?: string): Promise<void>;
    destroyContainer(vmid: number, node?: string): Promise<void>;
    resizeContainer(vmid: number, spec: {
        cpuCores?: number;
        ramMB?: number;
        storageGB?: number;
    }, node?: string): Promise<void>;
    reinstallContainer(vmid: number, spec: ProvisionSpec, ipv4: string, node?: string): Promise<{
        rootPassword: string;
    }>;
    setRootPassword(vmid: number, node?: string): Promise<{
        rootPassword: string;
    }>;
    getStatus(vmid: number, node?: string): Promise<ContainerStatus>;
    listClusterNodes(): Promise<Array<{
        name: string;
        currentLoad: number;
        online: boolean;
    }>>;
    listClusterStorage(): Promise<Array<{
        name: string;
        available: number;
        total: number;
        node: string;
    }>>;
    startContainerMigration(sourceNode: string, vmid: number, targetNode: string, targetStorage?: string): Promise<string | null>;
    getTaskStatus(node: string, upid: string): Promise<{
        status: string;
        exitstatus?: string;
        progress?: number;
    }>;
    stopTask(node: string, upid: string): Promise<void>;
}
