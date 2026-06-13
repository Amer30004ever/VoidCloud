import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { decryptSecret, encryptSecret } from '../common/utils/password.util';

@Injectable()
export class SecurityService {
  private readonly logger = new Logger(SecurityService.name);

  constructor(private prisma: PrismaService) {}

  // Vulnerability Scanner Methods
  async scanImage(imageName: string, tag?: string) {
    try {
      // For now, return a mock scan result
      // In production, this would integrate with Trivy, Clair, or similar tools
      const scanResult = {
        imageName: `${imageName}:${tag || 'latest'}`,
        scannedAt: new Date().toISOString(),
        vulnerabilities: [
          {
            id: 'CVE-2024-1234',
            severity: 'HIGH',
            package: 'openssl',
            version: '1.1.1k',
            fixedIn: '1.1.1l',
            description: 'Buffer overflow in X509_Extension_new',
          },
          {
            id: 'CVE-2024-5678',
            severity: 'MEDIUM',
            package: 'libcurl',
            version: '7.79.0',
            fixedIn: '7.80.0',
            description: 'Information disclosure via redirect',
          },
        ],
        summary: {
          total: 2,
          critical: 0,
          high: 1,
          medium: 1,
          low: 0,
        },
      };

      return { success: true, scanResult };
    } catch (error) {
      this.logger.error(`Error scanning image: ${error.message}`);
      throw error;
    }
  }

  async scanDeployment(namespace: string, deploymentName: string) {
    try {
      // For now, return a mock scan result
      const scanResult = {
        namespace,
        deploymentName,
        scannedAt: new Date().toISOString(),
        vulnerabilities: [
          {
            id: 'CVE-2024-9012',
            severity: 'CRITICAL',
            package: 'nodejs',
            version: '16.14.0',
            fixedIn: '16.15.0',
            description: 'Prototype pollution in querystring',
          },
        ],
        summary: {
          total: 1,
          critical: 1,
          high: 0,
          medium: 0,
          low: 0,
        },
      };

      return { success: true, scanResult };
    } catch (error) {
      this.logger.error(`Error scanning deployment: ${error.message}`);
      throw error;
    }
  }

  async getScanHistory(limit?: number) {
    try {
      // For now, return mock scan history
      const history = [
        {
          id: '1',
          target: 'nginx:latest',
          type: 'image',
          scannedAt: new Date(Date.now() - 3600000).toISOString(),
          status: 'completed',
          vulnerabilities: 2,
        },
        {
          id: '2',
          target: 'default/my-app',
          type: 'deployment',
          scannedAt: new Date(Date.now() - 7200000).toISOString(),
          status: 'completed',
          vulnerabilities: 1,
        },
      ];

      return { history: history.slice(0, limit || 10) };
    } catch (error) {
      this.logger.error(`Error fetching scan history: ${error.message}`);
      throw error;
    }
  }

  async getScanDetails(scanId: string) {
    try {
      // For now, return mock scan details
      const scanDetails = {
        id: scanId,
        target: 'nginx:latest',
        type: 'image',
        scannedAt: new Date(Date.now() - 3600000).toISOString(),
        status: 'completed',
        vulnerabilities: [
          {
            id: 'CVE-2024-1234',
            severity: 'HIGH',
            package: 'openssl',
            version: '1.1.1k',
            fixedIn: '1.1.1l',
            description: 'Buffer overflow in X509_Extension_new',
            links: ['https://nvd.nist.gov/vuln/detail/CVE-2024-1234'],
          },
        ],
      };

      return { scanDetails };
    } catch (error) {
      this.logger.error(`Error fetching scan details: ${error.message}`);
      throw error;
    }
  }

  async getVulnerabilityStats() {
    try {
      // For now, return mock stats
      const stats = {
        totalScans: 150,
        totalVulnerabilities: 45,
        critical: 5,
        high: 15,
        medium: 18,
        low: 7,
        recentScans: [
          { date: '2024-01-15', count: 12 },
          { date: '2024-01-14', count: 8 },
          { date: '2024-01-13', count: 15 },
        ],
      };

      return { stats };
    } catch (error) {
      this.logger.error(`Error fetching vulnerability stats: ${error.message}`);
      throw error;
    }
  }

  async getAppSecrets(userId: string, namespace?: string) {
    const secrets = await this.prisma.appSecret.findMany({
      where: { userId, ...(namespace ? { namespace } : {}) },
      select: {
        id: true,
        name: true,
        namespace: true,
        expiresAt: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return { secrets };
  }

  async createAppSecret(data: {
    name: string;
    value: string;
    namespace?: string;
    userId: string;
    expiresAt?: string;
  }) {
    const secret = await this.prisma.appSecret.create({
      data: {
        name: data.name,
        namespace: data.namespace ?? 'default',
        encryptedValue: encryptSecret(data.value),
        userId: data.userId,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined,
      },
      select: {
        id: true,
        name: true,
        namespace: true,
        expiresAt: true,
        createdAt: true,
      },
    });
    return { success: true, secret };
  }

  async revealAppSecret(id: string, userId: string) {
    const secret = await this.prisma.appSecret.findFirst({
      where: { id, userId },
    });
    if (!secret) throw new NotFoundException('Secret not found');
    return { value: decryptSecret(secret.encryptedValue) };
  }

  async deleteAppSecret(id: string, userId: string) {
    await this.prisma.appSecret.deleteMany({ where: { id, userId } });
    return { success: true };
  }
}
