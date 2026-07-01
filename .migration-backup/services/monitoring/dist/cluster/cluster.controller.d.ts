import { ClusterService } from './cluster.service';
export declare class ClusterController {
    private readonly clusterService;
    constructor(clusterService: ClusterService);
    getNodes(): Promise<{
        nodes: any;
    }>;
    getNodeDetails(name: string): Promise<{
        name: any;
        labels: any;
        annotations: any;
        status: any;
        conditions: any;
        roles: string[];
        podCount: any;
        pods: any;
    }>;
    getNodePods(nodeName: string): Promise<{
        nodeName: string;
        podCount: any;
        pods: any;
    }>;
    getQuotas(): Promise<{
        quotas: any;
    }>;
    setQuota(quotaData: any): Promise<{
        success: boolean;
        message: string;
    }>;
    getNetworkPolicies(): Promise<{
        policies: any;
    }>;
    createNetworkPolicy(policyData: any): Promise<{
        success: boolean;
        message: string;
    }>;
    getStorageClasses(): Promise<{
        storageClasses: any;
    }>;
    getPersistentVolumes(): Promise<{
        persistentVolumes: any;
    }>;
    getPersistentVolumeClaims(): Promise<{
        persistentVolumeClaims: any;
    }>;
    getEvents(namespace?: string, type?: string, limit?: string): Promise<{
        events: any;
    }>;
    getHelmReleases(): Promise<{
        releases: any[];
    }>;
    installHelmRelease(releaseData: any): Promise<{
        success: boolean;
        message: string;
    }>;
    uninstallHelmRelease(name: string, namespace: string): Promise<{
        success: boolean;
        message: string;
    }>;
    drainNode(nodeName: string): Promise<{
        success: boolean;
        message: string;
    }>;
    uncordonNode(nodeName: string): Promise<{
        success: boolean;
        message: string;
    }>;
}
