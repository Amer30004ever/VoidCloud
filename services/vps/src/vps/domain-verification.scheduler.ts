import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DomainVerificationScheduler {
  private readonly logger = new Logger(DomainVerificationScheduler.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_HOUR)
  async tick() {
    const pending = await this.prisma.domain.findMany({
      where: { status: 'PENDING_VERIFICATION' },
    });

    for (const domain of pending) {
      try {
        const verified = await this.attemptDnsVerification(domain.domain, domain.verifyToken);
        if (verified) {
          await this.prisma.domain.update({
            where: { id: domain.id },
            data: {
              status: 'VERIFIED',
              verifiedAt: new Date(),
            },
          });
          this.logger.log(`Domain ${domain.domain} automatically verified via TXT lookup`);
        }
      } catch (err) {
        this.logger.error(`DNS verification failed for ${domain.domain}: ${err}`);
      }
    }
  }

  private async attemptDnsVerification(domain: string, verifyToken: string): Promise<boolean> {
    const dns = await import('dns').then(m => m.promises);

    try {
      const records = await dns.resolveTxt(domain);
      const txtValues = (records ?? []).flat();
      return txtValues.some(value => value === verifyToken);
    } catch {
      return false;
    }
  }
}
