import { Injectable, Logger } from '@nestjs/common';
import { KubernetesService } from '../kubernetes/kubernetes.service';

@Injectable()
export class InfrastructureService {
  private readonly logger = new Logger(InfrastructureService.name);

  constructor(private kubernetesService: KubernetesService) {}

  /**
   * View all deployments in a namespace
   */
  async getDeployments(namespace?: string) {
    try {
      const deployments =
        await this.kubernetesService.getDeployments(namespace);
      return deployments.map((dep) => ({
        name: dep.metadata?.name,
        namespace: dep.metadata?.namespace,
        replicas: dep.spec?.replicas,
        readyReplicas: dep.status?.readyReplicas || 0,
        image: dep.spec?.template?.spec?.containers?.[0]?.image,
        createdAt: dep.metadata?.creationTimestamp,
        labels: dep.metadata?.labels || {},
      }));
    } catch (error) {
      this.logger.error(`Error fetching deployments: ${error.message}`);
      throw error;
    }
  }

  /**
   * View all services in a namespace
   */
  async getServices(namespace?: string) {
    try {
      const services = await this.kubernetesService.getServices(namespace);
      return services.map((svc) => ({
        name: svc.metadata?.name,
        namespace: svc.metadata?.namespace,
        type: svc.spec?.type,
        clusterIP: svc.spec?.clusterIP,
        externalIP: svc.spec?.externalIPs?.[0] || null,
        ports:
          svc.spec?.ports?.map((p) => ({
            name: p.name,
            port: p.port,
            targetPort: p.targetPort,
            protocol: p.protocol,
          })) || [],
        createdAt: svc.metadata?.creationTimestamp,
        labels: svc.metadata?.labels || {},
      }));
    } catch (error) {
      this.logger.error(`Error fetching services: ${error.message}`);
      throw error;
    }
  }

  /**
   * View all configmaps in a namespace
   */
  async getConfigMaps(namespace?: string) {
    try {
      const configmaps = await this.kubernetesService.getConfigMaps(namespace);
      return configmaps.map((cm) => ({
        name: cm.metadata?.name,
        namespace: cm.metadata?.namespace,
        keys: Object.keys(cm.data || {}),
        size: JSON.stringify(cm.data || {}).length,
        createdAt: cm.metadata?.creationTimestamp,
        labels: cm.metadata?.labels || {},
      }));
    } catch (error) {
      this.logger.error(`Error fetching configmaps: ${error.message}`);
      throw error;
    }
  }

  /**
   * View all secrets in a namespace (metadata only, no sensitive data)
   */
  async getSecrets(namespace?: string) {
    try {
      const secrets = await this.kubernetesService.getSecrets(namespace);
      return secrets.map((secret) => ({
        name: secret.metadata?.name,
        namespace: secret.metadata?.namespace,
        type: secret.type,
        keys: Object.keys(secret.data || {}),
        createdAt: secret.metadata?.creationTimestamp,
        labels: secret.metadata?.labels || {},
      }));
    } catch (error) {
      this.logger.error(`Error fetching secrets: ${error.message}`);
      throw error;
    }
  }

  /**
   * Scale deployment (increase/decrease replicas)
   */
  async scaleDeployment(
    namespace: string,
    deploymentName: string,
    replicas: number,
  ) {
    try {
      if (replicas < 0) throw new Error('Replicas cannot be negative');

      const deployment = await this.kubernetesService.patchDeployment(
        namespace,
        deploymentName,
        {
          spec: {
            replicas: replicas,
          },
        },
      );

      this.logger.log(
        `Scaled deployment ${deploymentName} to ${replicas} replicas`,
      );
      return {
        name: deployment.metadata?.name,
        namespace: deployment.metadata?.namespace,
        replicas: deployment.spec?.replicas,
        message: `Successfully scaled to ${replicas} replicas`,
      };
    } catch (error) {
      this.logger.error(`Error scaling deployment: ${error.message}`);
      throw error;
    }
  }

  /**
   * Deploy from Docker image
   */
  async deployFromImage(
    namespace: string,
    name: string,
    image: string,
    replicas: number = 1,
    port: number = 3000,
    env: Record<string, string> = {},
  ) {
    try {
      const deployment = await this.kubernetesService.createDeployment(
        namespace,
        name,
        image,
        replicas,
        port,
        env,
      );

      this.logger.log(`Created deployment ${name} from image ${image}`);
      return {
        name: deployment.metadata?.name,
        namespace: deployment.metadata?.namespace,
        replicas: deployment.spec?.replicas,
        image: deployment.spec?.template?.spec?.containers?.[0]?.image,
        message: `Successfully deployed ${name}`,
      };
    } catch (error) {
      this.logger.error(`Error deploying image: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get deployment YAML
   */
  async getDeploymentYaml(namespace: string, deploymentName: string) {
    try {
      const deployment = await this.kubernetesService.getDeploymentYaml(
        namespace,
        deploymentName,
      );
      return deployment;
    } catch (error) {
      this.logger.error(`Error fetching deployment YAML: ${error.message}`);
      throw error;
    }
  }

  /**
   * Edit deployment YAML
   */
  async updateDeploymentYaml(
    namespace: string,
    deploymentName: string,
    yaml: any,
  ) {
    try {
      const deployment = await this.kubernetesService.updateDeploymentYaml(
        namespace,
        deploymentName,
        yaml,
      );

      this.logger.log(`Updated deployment ${deploymentName}`);
      return {
        name: deployment.metadata?.name,
        namespace: deployment.metadata?.namespace,
        message: `Successfully updated ${deploymentName}`,
      };
    } catch (error) {
      this.logger.error(`Error updating deployment YAML: ${error.message}`);
      throw error;
    }
  }

  /**
   * Delete deployment
   */
  async deleteDeployment(namespace: string, deploymentName: string) {
    try {
      await this.kubernetesService.deleteDeployment(namespace, deploymentName);
      this.logger.log(`Deleted deployment ${deploymentName}`);
      return {
        message: `Successfully deleted ${deploymentName}`,
      };
    } catch (error) {
      this.logger.error(`Error deleting deployment: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update ConfigMap
   */
  async updateConfigMap(
    namespace: string,
    configMapName: string,
    data: Record<string, string>,
  ) {
    try {
      const configMap = await this.kubernetesService.updateConfigMap(
        namespace,
        configMapName,
        data,
      );

      this.logger.log(`Updated ConfigMap ${configMapName}`);
      return {
        name: configMap.metadata?.name,
        namespace: configMap.metadata?.namespace,
        keys: Object.keys(configMap.data || {}),
        message: `Successfully updated ${configMapName}`,
      };
    } catch (error) {
      this.logger.error(`Error updating ConfigMap: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get all namespaces
   */
  async getAllNamespaces() {
    try {
      return await this.kubernetesService.getNamespaces();
    } catch (error) {
      this.logger.error(`Error fetching namespaces: ${error.message}`);
      throw error;
    }
  }
}
