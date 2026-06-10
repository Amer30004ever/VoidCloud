import { Injectable, Logger } from '@nestjs/common';
import { KubernetesService } from '../kubernetes/kubernetes.service';

@Injectable()
export class ClusterService {
  private readonly logger = new Logger(ClusterService.name);

  constructor(private readonly kubernetesService: KubernetesService) {}

  async getNodes() {
    try {
      this.kubernetesService.ensureConnected();
      const nodes = await this.kubernetesService.coreV1Api.listNode();
      
      const nodeDetails = await Promise.all(
        nodes.items.map(async (node) => {
          const nodeName = node.metadata?.name;
          const pods = await this.kubernetesService.coreV1Api.listPodForAllNamespaces({
            fieldSelector: `spec.nodeName=${nodeName}`,
          });

          const cpuCapacity = node.status?.capacity?.cpu || '0';
          const memoryCapacity = node.status?.capacity?.memory || '0';
          const storageCapacity = node.status?.capacity?.['ephemeral-storage'] || '0';

          return {
            name: nodeName,
            labels: node.metadata?.labels || {},
            status: node.status?.conditions?.find(c => c.type === 'Ready')?.status || 'Unknown',
            roles: this.getNodeRoles(node),
            cpu: {
              capacity: cpuCapacity,
              allocatable: node.status?.allocatable?.cpu || '0',
            },
            memory: {
              capacity: this.parseMemory(memoryCapacity),
              allocatable: this.parseMemory(node.status?.allocatable?.memory || '0'),
            },
            storage: {
              capacity: this.parseMemory(storageCapacity),
              allocatable: this.parseMemory(node.status?.allocatable?.['ephemeral-storage'] || '0'),
            },
            podCount: pods.items.length,
            pods: pods.items.map(pod => ({
              name: pod.metadata?.name,
              namespace: pod.metadata?.namespace,
              status: pod.status?.phase,
            })),
            createdAt: node.metadata?.creationTimestamp,
          };
        })
      );

      return { nodes: nodeDetails };
    } catch (error) {
      this.logger.error(`Error fetching nodes: ${error.message}`);
      throw error;
    }
  }

  async getNodeDetails(nodeName: string) {
    try {
      this.kubernetesService.ensureConnected();
      const node = await this.kubernetesService.coreV1Api.readNode({ name: nodeName });
      
      const pods = await this.kubernetesService.coreV1Api.listPodForAllNamespaces({
        fieldSelector: `spec.nodeName=${nodeName}`,
      });

      return {
        name: node.metadata?.name,
        labels: node.metadata?.labels || {},
        annotations: node.metadata?.annotations || {},
        status: node.status,
        conditions: node.status?.conditions || [],
        roles: this.getNodeRoles(node),
        podCount: pods.items.length,
        pods: pods.items.map(pod => ({
          name: pod.metadata?.name,
          namespace: pod.metadata?.namespace,
          status: pod.status?.phase,
          restarts: pod.status?.containerStatuses?.reduce((sum, cs) => sum + (cs.restartCount || 0), 0) || 0,
        })),
      };
    } catch (error) {
      this.logger.error(`Error fetching node details: ${error.message}`);
      throw error;
    }
  }

  async getNodePods(nodeName: string) {
    try {
      this.kubernetesService.ensureConnected();
      const pods = await this.kubernetesService.coreV1Api.listPodForAllNamespaces({
        fieldSelector: `spec.nodeName=${nodeName}`,
      });

      return {
        nodeName,
        podCount: pods.items.length,
        pods: pods.items.map(pod => ({
          name: pod.metadata?.name,
          namespace: pod.metadata?.namespace,
          status: pod.status?.phase,
          ready: pod.status?.containerStatuses?.filter(cs => cs.ready).length || 0,
          totalContainers: pod.status?.containerStatuses?.length || 0,
          restarts: pod.status?.containerStatuses?.reduce((sum, cs) => sum + (cs.restartCount || 0), 0) || 0,
          age: this.calculateAge(pod.metadata?.creationTimestamp?.toISOString()),
        })),
      };
    } catch (error) {
      this.logger.error(`Error fetching node pods: ${error.message}`);
      throw error;
    }
  }

  async getQuotas() {
    try {
      this.kubernetesService.ensureConnected();
      const quotas = await this.kubernetesService.coreV1Api.listResourceQuotaForAllNamespaces();

      return {
        quotas: quotas.items.map(quota => ({
          name: quota.metadata?.name,
          namespace: quota.metadata?.namespace,
          hard: quota.status?.hard || {},
          used: quota.status?.used || {},
          createdAt: quota.metadata?.creationTimestamp,
        })),
      };
    } catch (error) {
      this.logger.error(`Error fetching quotas: ${error.message}`);
      throw error;
    }
  }

  async setQuota(quotaData: any) {
    try {
      this.kubernetesService.ensureConnected();
      const { namespace, name, hard } = quotaData;

      const quota = {
        apiVersion: 'v1',
        kind: 'ResourceQuota',
        metadata: {
          name,
          namespace,
        },
        spec: {
          hard,
        },
      };

      await this.kubernetesService.coreV1Api.createNamespacedResourceQuota({
        namespace,
        body: quota,
      });
      this.logger.log(`Created resource quota ${name} in namespace ${namespace}`);
      return { success: true, message: `Resource quota ${name} created` };
    } catch (error) {
      this.logger.error(`Error setting quota: ${error.message}`);
      throw error;
    }
  }

  async getNetworkPolicies() {
    try {
      this.kubernetesService.ensureConnected();
      const policies = await this.kubernetesService.networkingV1Api.listNetworkPolicyForAllNamespaces();

      return {
        policies: policies.items.map(policy => ({
          name: policy.metadata?.name,
          namespace: policy.metadata?.namespace,
          podSelector: policy.spec?.podSelector,
          policyTypes: policy.spec?.policyTypes || [],
          ingress: policy.spec?.ingress || [],
          egress: policy.spec?.egress || [],
          createdAt: policy.metadata?.creationTimestamp,
        })),
      };
    } catch (error) {
      this.logger.error(`Error fetching network policies: ${error.message}`);
      throw error;
    }
  }

  async createNetworkPolicy(policyData: any) {
    try {
      this.kubernetesService.ensureConnected();
      const { namespace, name, spec } = policyData;

      const policy = {
        apiVersion: 'networking.k8s.io/v1',
        kind: 'NetworkPolicy',
        metadata: {
          name,
          namespace,
        },
        spec,
      };

      await this.kubernetesService.networkingV1Api.createNamespacedNetworkPolicy({
        namespace,
        body: policy,
      });
      this.logger.log(`Created network policy ${name} in namespace ${namespace}`);
      return { success: true, message: `Network policy ${name} created` };
    } catch (error) {
      this.logger.error(`Error creating network policy: ${error.message}`);
      throw error;
    }
  }

  async getStorageClasses() {
    try {
      this.kubernetesService.ensureConnected();
      const storageClasses = await this.kubernetesService.storageV1Api.listStorageClass();

      return {
        storageClasses: storageClasses.items.map(sc => ({
          name: sc.metadata?.name,
          provisioner: sc.provisioner,
          reclaimPolicy: sc.reclaimPolicy,
          volumeBindingMode: sc.volumeBindingMode,
          allowVolumeExpansion: sc.allowVolumeExpansion,
          parameters: sc.parameters || {},
          createdAt: sc.metadata?.creationTimestamp,
        })),
      };
    } catch (error) {
      this.logger.error(`Error fetching storage classes: ${error.message}`);
      throw error;
    }
  }

  async getPersistentVolumes() {
    try {
      this.kubernetesService.ensureConnected();
      const pvs = await this.kubernetesService.coreV1Api.listPersistentVolume();

      return {
        persistentVolumes: pvs.items.map(pv => ({
          name: pv.metadata?.name,
          capacity: pv.spec?.capacity || {},
          accessModes: pv.spec?.accessModes || [],
          reclaimPolicy: pv.spec?.persistentVolumeReclaimPolicy,
          status: pv.status?.phase,
          storageClass: pv.spec?.storageClassName,
          claimRef: pv.spec?.claimRef,
          createdAt: pv.metadata?.creationTimestamp,
        })),
      };
    } catch (error) {
      this.logger.error(`Error fetching persistent volumes: ${error.message}`);
      throw error;
    }
  }

  async getPersistentVolumeClaims() {
    try {
      this.kubernetesService.ensureConnected();
      const pvcs = await this.kubernetesService.coreV1Api.listPersistentVolumeClaimForAllNamespaces();

      return {
        persistentVolumeClaims: pvcs.items.map(pvc => ({
          name: pvc.metadata?.name,
          namespace: pvc.metadata?.namespace,
          capacity: pvc.spec?.resources?.requests?.storage || '',
          accessModes: pvc.spec?.accessModes || [],
          status: pvc.status?.phase,
          storageClass: pvc.spec?.storageClassName,
          volumeName: pvc.spec?.volumeName,
          createdAt: pvc.metadata?.creationTimestamp,
        })),
      };
    } catch (error) {
      this.logger.error(`Error fetching persistent volume claims: ${error.message}`);
      throw error;
    }
  }

  async getEvents(namespace?: string, type?: string, limit: number = 50) {
    try {
      this.kubernetesService.ensureConnected();
      let events;

      if (namespace) {
        events = await this.kubernetesService.coreV1Api.listNamespacedEvent({ namespace });
      } else {
        events = await this.kubernetesService.coreV1Api.listEventForAllNamespaces();
      }

      let filteredEvents = events.items;

      if (type) {
        filteredEvents = filteredEvents.filter(event => event.type === type);
      }

      filteredEvents = filteredEvents.slice(0, limit);

      return {
        events: filteredEvents.map(event => ({
          type: event.type,
          reason: event.reason,
          message: event.message,
          involvedObject: {
            kind: event.involvedObject?.kind,
            name: event.involvedObject?.name,
            namespace: event.involvedObject?.namespace,
          },
          source: event.source,
          firstSeen: event.firstTimestamp,
          lastSeen: event.lastTimestamp,
          count: event.count,
        })),
      };
    } catch (error) {
      this.logger.error(`Error fetching events: ${error.message}`);
      throw error;
    }
  }

  async getHelmReleases() {
    try {
      // This would require Helm SDK integration
      // For now, return placeholder data
      this.logger.log('Helm releases - requires Helm SDK integration');
      return { releases: [] };
    } catch (error) {
      this.logger.error(`Error fetching Helm releases: ${error.message}`);
      throw error;
    }
  }

  async installHelmRelease(releaseData: any) {
    try {
      // This would require Helm SDK integration
      this.logger.log('Helm install - requires Helm SDK integration');
      return { success: false, message: 'Helm SDK integration required' };
    } catch (error) {
      this.logger.error(`Error installing Helm release: ${error.message}`);
      throw error;
    }
  }

  async uninstallHelmRelease(name: string, namespace: string) {
    try {
      // This would require Helm SDK integration
      this.logger.log('Helm uninstall - requires Helm SDK integration');
      return { success: false, message: 'Helm SDK integration required' };
    } catch (error) {
      this.logger.error(`Error uninstalling Helm release: ${error.message}`);
      throw error;
    }
  }

  async drainNode(nodeName: string) {
    try {
      this.kubernetesService.ensureConnected();
      // Cordon and drain operations are not directly available in the Kubernetes client API
      // These would require using kubectl or implementing the logic manually
      // For now, return a placeholder response
      this.logger.log(`Drain node ${nodeName} - requires kubectl integration`);
      return { success: false, message: 'Node drain requires kubectl integration' };
    } catch (error) {
      this.logger.error(`Error draining node: ${error.message}`);
      throw error;
    }
  }

  async uncordonNode(nodeName: string) {
    try {
      this.kubernetesService.ensureConnected();
      // Uncordon operation is not directly available in the Kubernetes client API
      // This would require using kubectl or implementing the logic manually
      // For now, return a placeholder response
      this.logger.log(`Uncordon node ${nodeName} - requires kubectl integration`);
      return { success: false, message: 'Node uncordon requires kubectl integration' };
    } catch (error) {
      this.logger.error(`Error uncordoning node: ${error.message}`);
      throw error;
    }
  }

  private ensureConnected() {
    this.kubernetesService.ensureConnected();
  }

  private getNodeRoles(node: any): string[] {
    const labels = node.metadata?.labels || {};
    const roles: string[] = [];

    if (labels['node-role.kubernetes.io/master'] || labels['node-role.kubernetes.io/control-plane']) {
      roles.push('master');
    }
    if (labels['node-role.kubernetes.io/worker']) {
      roles.push('worker');
    }

    return roles.length > 0 ? roles : ['worker'];
  }

  private parseMemory(memoryStr: string): number {
    if (!memoryStr) return 0;
    const units: { [key: string]: number } = {
      Ki: 1024,
      Mi: 1024 * 1024,
      Gi: 1024 * 1024 * 1024,
      Ti: 1024 * 1024 * 1024 * 1024,
      K: 1000,
      M: 1000 * 1000,
      G: 1000 * 1000 * 1000,
      T: 1000 * 1000 * 1000 * 1000,
    };

    const match = memoryStr.match(/^(\d+)([A-Za-z]+)?$/);
    if (!match) return 0;

    const value = parseInt(match[1]);
    const unit = match[2] || '';

    return value * (units[unit] || 1);
  }

  private calculateAge(timestamp?: string): string {
    if (!timestamp) return 'Unknown';
    const now = new Date();
    const created = new Date(timestamp);
    const diff = now.getTime() - created.getTime();

    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d`;
    if (hours > 0) return `${hours}h`;
    if (minutes > 0) return `${minutes}m`;
    return `${seconds}s`;
  }
}
