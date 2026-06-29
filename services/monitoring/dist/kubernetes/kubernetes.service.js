"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var KubernetesService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.KubernetesService = void 0;
const common_1 = require("@nestjs/common");
const client_node_1 = require("@kubernetes/client-node");
let KubernetesService = KubernetesService_1 = class KubernetesService {
    constructor() {
        this.logger = new common_1.Logger(KubernetesService_1.name);
        this.isConnected = false;
    }
    async onModuleInit() {
        try {
            await this.initializeKubernetesClient();
        }
        catch (error) {
            this.logger.error(`Failed to initialize Kubernetes client: ${error.message}`);
        }
    }
    async initializeKubernetesClient() {
        const kubeConfig = new client_node_1.KubeConfig();
        const isInCluster = process.env.KUBERNETES_SERVICE_HOST &&
            process.env.KUBERNETES_SERVICE_PORT;
        if (isInCluster) {
            try {
                kubeConfig.loadFromCluster();
                this.applyDevClusterTlsSettings(kubeConfig);
                this.logger.log('Loaded Kubernetes config from cluster (in-cluster mode)');
            }
            catch (error) {
                this.logger.error(`Failed to load in-cluster config: ${error.message}`);
                throw error;
            }
        }
        else {
            try {
                kubeConfig.loadFromDefault();
                this.applyDevClusterTlsSettings(kubeConfig);
                this.logger.log('Loaded Kubernetes config from default location (development mode)');
            }
            catch (error) {
                this.logger.warn('Could not load Kubernetes config from default location');
                throw error;
            }
        }
        this.coreV1Api = kubeConfig.makeApiClient(client_node_1.CoreV1Api);
        this.appsV1Api = kubeConfig.makeApiClient(client_node_1.AppsV1Api);
        this.customObjectsApi = kubeConfig.makeApiClient(client_node_1.CustomObjectsApi);
        this.networkingV1Api = kubeConfig.makeApiClient(client_node_1.NetworkingV1Api);
        this.storageV1Api = kubeConfig.makeApiClient(client_node_1.StorageV1Api);
        this.isConnected = true;
        this.logger.log('Kubernetes client initialized successfully');
    }
    applyDevClusterTlsSettings(kubeConfig) {
        const allowInsecure = process.env.K8S_INSECURE_SKIP_TLS_VERIFY === 'true' ||
            process.env.NODE_ENV !== 'production';
        if (!allowInsecure)
            return;
        for (const cluster of kubeConfig.clusters) {
            if (cluster.server?.startsWith('http://')) {
                cluster.skipTLSVerify = true;
                this.logger.warn(`Kubernetes cluster "${cluster.name}" uses HTTP; skipTLSVerify enabled (dev only)`);
            }
        }
    }
    ensureConnected() {
        if (!this.isConnected) {
            throw new Error('Kubernetes client is not connected');
        }
    }
    async getNamespaces() {
        this.ensureConnected();
        try {
            const res = await this.coreV1Api.listNamespace();
            return res.items
                .map((ns) => ns.metadata?.name)
                .filter((name) => name && name !== 'kube-system' && !name.startsWith('kube-'));
        }
        catch (error) {
            this.logger.error(`Error fetching namespaces: ${error.message}`);
            throw error;
        }
    }
    async getPods(namespace) {
        this.ensureConnected();
        try {
            const res = namespace
                ? await this.coreV1Api.listNamespacedPod({ namespace })
                : await this.coreV1Api.listPodForAllNamespaces();
            return res.items;
        }
        catch (error) {
            this.logger.error(`Error fetching pods: ${error.message}`);
            throw error;
        }
    }
    async getDeployments(namespace) {
        this.ensureConnected();
        try {
            const res = namespace
                ? await this.appsV1Api.listNamespacedDeployment({ namespace })
                : await this.appsV1Api.listDeploymentForAllNamespaces();
            return res.items;
        }
        catch (error) {
            this.logger.error(`Error fetching deployments: ${error.message}`);
            throw error;
        }
    }
    async getRunningPodsCount() {
        this.ensureConnected();
        try {
            const pods = await this.getPods();
            return pods.filter((pod) => pod.status?.phase === 'Running').length;
        }
        catch (error) {
            this.logger.error(`Error counting running pods: ${error.message}`);
            throw error;
        }
    }
    async getRunningNamespacesCount() {
        this.ensureConnected();
        try {
            const namespaces = await this.getNamespaces();
            return namespaces.length;
        }
        catch (error) {
            this.logger.error(`Error counting running namespaces: ${error.message}`);
            throw error;
        }
    }
    async getDeploymentsToday() {
        this.ensureConnected();
        try {
            const deployments = await this.getDeployments();
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            return deployments.filter((deployment) => {
                const creationTime = new Date(deployment.metadata?.creationTimestamp || '');
                return creationTime >= today;
            }).length;
        }
        catch (error) {
            this.logger.error(`Error counting deployments today: ${error.message}`);
            throw error;
        }
    }
    async getActivePipelines() {
        this.ensureConnected();
        try {
            return 0;
        }
        catch (error) {
            this.logger.error(`Error fetching active pipelines: ${error.message}`);
            throw error;
        }
    }
    async getActiveAlerts() {
        this.ensureConnected();
        try {
            return 0;
        }
        catch (error) {
            this.logger.error(`Error fetching active alerts: ${error.message}`);
            throw error;
        }
    }
    async getServices(namespace) {
        this.ensureConnected();
        try {
            const res = namespace
                ? await this.coreV1Api.listNamespacedService({ namespace })
                : await this.coreV1Api.listServiceForAllNamespaces();
            return res.items;
        }
        catch (error) {
            this.logger.error(`Error fetching services: ${error.message}`);
            throw error;
        }
    }
    async getConfigMaps(namespace) {
        this.ensureConnected();
        try {
            const res = namespace
                ? await this.coreV1Api.listNamespacedConfigMap({ namespace })
                : await this.coreV1Api.listConfigMapForAllNamespaces();
            return res.items;
        }
        catch (error) {
            this.logger.error(`Error fetching configmaps: ${error.message}`);
            throw error;
        }
    }
    async getSecrets(namespace) {
        this.ensureConnected();
        try {
            const res = namespace
                ? await this.coreV1Api.listNamespacedSecret({ namespace })
                : await this.coreV1Api.listSecretForAllNamespaces();
            return res.items;
        }
        catch (error) {
            this.logger.error(`Error fetching secrets: ${error.message}`);
            throw error;
        }
    }
    async patchDeployment(namespace, deploymentName, patch) {
        this.ensureConnected();
        try {
            const res = await this.appsV1Api.patchNamespacedDeployment({
                name: deploymentName,
                namespace,
                body: patch,
            });
            return res;
        }
        catch (error) {
            this.logger.error(`Error patching deployment: ${error.message}`);
            throw error;
        }
    }
    async createDeployment(namespace, name, image, replicas = 1, port = 3000, env = {}) {
        this.ensureConnected();
        try {
            const envVars = Object.entries(env).map(([key, value]) => ({
                name: key,
                value,
            }));
            const deployment = {
                apiVersion: 'apps/v1',
                kind: 'Deployment',
                metadata: {
                    name,
                    namespace,
                },
                spec: {
                    replicas,
                    selector: {
                        matchLabels: {
                            app: name,
                        },
                    },
                    template: {
                        metadata: {
                            labels: {
                                app: name,
                            },
                        },
                        spec: {
                            containers: [
                                {
                                    name,
                                    image,
                                    ports: [
                                        {
                                            containerPort: port,
                                        },
                                    ],
                                    env: envVars.length > 0 ? envVars : undefined,
                                },
                            ],
                        },
                    },
                },
            };
            const res = await this.appsV1Api.createNamespacedDeployment({
                namespace,
                body: deployment,
            });
            return res;
        }
        catch (error) {
            this.logger.error(`Error creating deployment: ${error.message}`);
            throw error;
        }
    }
    async deleteDeployment(namespace, deploymentName) {
        this.ensureConnected();
        try {
            await this.appsV1Api.deleteNamespacedDeployment({
                name: deploymentName,
                namespace,
            });
        }
        catch (error) {
            this.logger.error(`Error deleting deployment: ${error.message}`);
            throw error;
        }
    }
    async getDeploymentYaml(namespace, deploymentName) {
        this.ensureConnected();
        try {
            const deployment = await this.appsV1Api.readNamespacedDeployment({
                name: deploymentName,
                namespace,
            });
            return deployment;
        }
        catch (error) {
            this.logger.error(`Error fetching deployment YAML: ${error.message}`);
            throw error;
        }
    }
    async updateDeploymentYaml(namespace, deploymentName, yaml) {
        this.ensureConnected();
        try {
            const res = await this.appsV1Api.patchNamespacedDeployment({
                name: deploymentName,
                namespace,
                body: yaml,
            });
            return res;
        }
        catch (error) {
            this.logger.error(`Error updating deployment YAML: ${error.message}`);
            throw error;
        }
    }
    async updateConfigMap(namespace, configMapName, data) {
        this.ensureConnected();
        try {
            const configMap = await this.coreV1Api.readNamespacedConfigMap({
                name: configMapName,
                namespace,
            });
            configMap.data = data;
            const res = await this.coreV1Api.patchNamespacedConfigMap({
                name: configMapName,
                namespace,
                body: configMap,
            });
            return res;
        }
        catch (error) {
            this.logger.error(`Error updating configmap: ${error.message}`);
            throw error;
        }
    }
    isKubernetesConnected() {
        return this.isConnected;
    }
    async getPodLogs(namespace, podName, options = {}) {
        this.ensureConnected();
        try {
            const requestOptions = {
                namespace,
                name: podName,
            };
            if (options.previous)
                requestOptions.previous = true;
            if (options.tailLines)
                requestOptions.tailLines = options.tailLines;
            if (options.timestamps)
                requestOptions.timestamps = true;
            if (options.sinceSeconds)
                requestOptions.sinceSeconds = options.sinceSeconds;
            if (options.container)
                requestOptions.container = options.container;
            const logs = await this.coreV1Api.readNamespacedPodLog(requestOptions);
            return logs;
        }
        catch (error) {
            this.logger.error(`Error fetching pod logs: ${error.message}`);
            throw error;
        }
    }
    async getPodDetails(namespace, podName) {
        this.ensureConnected();
        try {
            const pod = await this.coreV1Api.readNamespacedPod({
                namespace,
                name: podName,
            });
            return pod;
        }
        catch (error) {
            this.logger.error(`Error fetching pod details: ${error.message}`);
            throw error;
        }
    }
    async getClusterMetrics() {
        try {
            this.ensureConnected();
            const pods = await this.getPods();
            const nodes = await this.coreV1Api.listNode();
            this.logger.log(`Fetched ${pods.length} pods and ${nodes.items.length} nodes for cluster metrics`);
            const liveUsage = await this.getLiveClusterUsageFromMetricsApi();
            const nodeMetrics = [];
            for (const node of nodes.items) {
                const nodeName = node.metadata?.name;
                const cpuCapacity = parseFloat(node.status?.capacity?.cpu || '0');
                const memoryCapacity = this.parseMemory(node.status?.capacity?.memory || '0');
                const storageCapacity = this.parseMemory(node.status?.capacity?.['ephemeral-storage'] || '0');
                const nodeLiveUsage = liveUsage?.nodeUsage?.[nodeName] || {
                    cpu: 0,
                    memory: 0,
                };
                const nodePods = pods.filter((p) => p.spec?.nodeName === nodeName);
                let estimatedCpuUsage = 0;
                let estimatedMemoryUsage = 0;
                let estimatedDiskUsage = 0;
                for (const pod of nodePods) {
                    const containers = pod.spec?.containers || [];
                    for (const container of containers) {
                        const cpuRequestedOrLimited = container.resources?.requests?.cpu ??
                            container.resources?.limits?.cpu ??
                            '0';
                        const memoryRequestedOrLimited = container.resources?.requests?.memory ??
                            container.resources?.limits?.memory ??
                            '0';
                        const diskRequestedOrLimited = container.resources?.requests?.['ephemeral-storage'] ??
                            container.resources?.limits?.['ephemeral-storage'] ??
                            '0';
                        estimatedCpuUsage += this.parseCpu(cpuRequestedOrLimited);
                        estimatedMemoryUsage += this.parseMemory(memoryRequestedOrLimited);
                        estimatedDiskUsage += this.parseMemory(diskRequestedOrLimited);
                    }
                }
                const cpuUsage = nodeLiveUsage.cpu || estimatedCpuUsage;
                const memoryUsage = nodeLiveUsage.memory || estimatedMemoryUsage;
                const diskUsage = estimatedDiskUsage;
                const cpuUsagePercent = cpuCapacity > 0 ? (cpuUsage / cpuCapacity) * 100 : 0;
                const memoryUsagePercent = memoryCapacity > 0 ? (memoryUsage / memoryCapacity) * 100 : 0;
                const diskUsagePercent = storageCapacity > 0 ? (diskUsage / storageCapacity) * 100 : 0;
                const isMaster = nodeName.toLowerCase().includes('master') ||
                    nodeName.toLowerCase().includes('control') ||
                    node.metadata?.labels?.['node-role.kubernetes.io/control-plane'] ===
                        'true' ||
                    node.metadata?.labels?.['node-role.kubernetes.io/master'] === 'true';
                nodeMetrics.push({
                    name: nodeName,
                    role: isMaster ? 'master' : 'worker',
                    cpu: {
                        usage: cpuUsage,
                        capacity: cpuCapacity,
                        usagePercent: Math.round(cpuUsagePercent * 100) / 100,
                    },
                    memory: {
                        usage: memoryUsage,
                        capacity: memoryCapacity,
                        usagePercent: Math.round(memoryUsagePercent * 100) / 100,
                    },
                    disk: {
                        usage: diskUsage,
                        capacity: storageCapacity,
                        usagePercent: Math.round(diskUsagePercent * 100) / 100,
                    },
                    pods: nodePods.length,
                    source: {
                        cpu: nodeLiveUsage.cpu
                            ? 'metrics-api'
                            : 'requests-limits-estimation',
                        memory: nodeLiveUsage.memory
                            ? 'metrics-api'
                            : 'requests-limits-estimation',
                        disk: 'requests-limits-estimation',
                    },
                });
            }
            this.logger.log(`Per-node metrics: ${nodeMetrics.map((n) => `${n.name} (${n.role}): CPU ${n.cpu.usagePercent}%, Memory ${n.memory.usagePercent}%`).join(', ')}`);
            return {
                nodes: nodeMetrics,
                totalPods: pods.length,
            };
        }
        catch (error) {
            this.logger.error(`Error fetching cluster metrics: ${error.message}`);
            return {
                nodes: [],
                totalPods: 0,
                error: error.message,
            };
        }
    }
    parseCpu(cpu) {
        if (!cpu)
            return 0;
        if (cpu.endsWith('n')) {
            return parseFloat(cpu) / 1_000_000_000;
        }
        if (cpu.endsWith('u')) {
            return parseFloat(cpu) / 1_000_000;
        }
        if (cpu.endsWith('m')) {
            return parseFloat(cpu) / 1000;
        }
        return parseFloat(cpu);
    }
    parseMemory(memory) {
        if (!memory)
            return 0;
        const units = {
            Ki: 1024,
            Mi: 1024 * 1024,
            Gi: 1024 * 1024 * 1024,
            Ti: 1024 * 1024 * 1024 * 1024,
            K: 1000,
            M: 1000 * 1000,
            G: 1000 * 1000 * 1000,
            T: 1000 * 1000 * 1000 * 1000,
        };
        for (const [unit, multiplier] of Object.entries(units)) {
            if (memory.endsWith(unit)) {
                return parseFloat(memory.slice(0, -unit.length)) * multiplier;
            }
        }
        return parseFloat(memory);
    }
    async getLiveClusterUsageFromMetricsApi() {
        try {
            const response = await this.customObjectsApi.listClusterCustomObject({
                group: 'metrics.k8s.io',
                version: 'v1beta1',
                plural: 'nodes',
            });
            const items = this.extractMetricsItems(response);
            if (!items.length) {
                return null;
            }
            const nodeUsage = {};
            for (const item of items) {
                const nodeName = item.metadata?.name;
                if (!nodeName)
                    continue;
                const usage = item.usage;
                if (!usage)
                    continue;
                nodeUsage[nodeName] = {
                    cpu: this.parseCpu(usage.cpu ?? '0'),
                    memory: this.parseMemory(usage.memory ?? '0'),
                };
            }
            return { nodeUsage };
        }
        catch (error) {
            this.logger.warn(`metrics.k8s.io unavailable, using requests/limits fallback: ${error.message}`);
            return null;
        }
    }
    extractMetricsItems(response) {
        if (!response || typeof response !== 'object') {
            return [];
        }
        const root = response;
        const directItems = root.items;
        if (Array.isArray(directItems)) {
            return directItems;
        }
        const bodyItems = root.body?.items;
        if (Array.isArray(bodyItems)) {
            return bodyItems;
        }
        return [];
    }
    async getRecentDeployments(limit = 5) {
        this.ensureConnected();
        try {
            const deployments = await this.getDeployments();
            return deployments
                .sort((a, b) => {
                const dateA = new Date(a.metadata?.creationTimestamp || 0);
                const dateB = new Date(b.metadata?.creationTimestamp || 0);
                return dateB.getTime() - dateA.getTime();
            })
                .slice(0, limit)
                .map((dep) => ({
                name: dep.metadata?.name,
                namespace: dep.metadata?.namespace,
                replicas: dep.spec?.replicas,
                readyReplicas: dep.status?.readyReplicas || 0,
                image: dep.spec?.template?.spec?.containers?.[0]?.image,
                createdAt: dep.metadata?.creationTimestamp,
            }));
        }
        catch (error) {
            this.logger.error(`Error fetching recent deployments: ${error.message}`);
            throw error;
        }
    }
    async getFailedPods() {
        this.ensureConnected();
        try {
            const pods = await this.getPods();
            return pods
                .filter((pod) => {
                const phase = pod.status?.phase;
                return (phase === 'Failed' ||
                    phase === 'CrashLoopBackOff' ||
                    phase === 'Error');
            })
                .map((pod) => ({
                name: pod.metadata?.name,
                namespace: pod.metadata?.namespace,
                phase: pod.status?.phase,
                restartCount: pod.status?.containerStatuses?.[0]?.restartCount || 0,
                reason: pod.status?.containerStatuses?.[0]?.state?.terminated?.reason,
                message: pod.status?.containerStatuses?.[0]?.state?.terminated?.message,
                createdAt: pod.metadata?.creationTimestamp,
            }));
        }
        catch (error) {
            this.logger.error(`Error fetching failed pods: ${error.message}`);
            throw error;
        }
    }
};
exports.KubernetesService = KubernetesService;
exports.KubernetesService = KubernetesService = KubernetesService_1 = __decorate([
    (0, common_1.Injectable)()
], KubernetesService);
//# sourceMappingURL=kubernetes.service.js.map