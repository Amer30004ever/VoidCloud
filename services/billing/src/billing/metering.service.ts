import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ClientProxy, ClientProxyFactory, RmqOptions, Transport } from '@nestjs/microservices';
import { lastValueFrom } from 'rxjs';
import { PrismaService } from '../prisma/prisma.service';
import { CreditService } from './credit.service';
import { BillingMode, CloudDeploymentStatus } from '@prisma/client';

function meteringEventsConfig(): RmqOptions {
    const host = process.env.RABBITMQ_HOST ?? 'rabbitmq';
    const port = Number(process.env.RABBITMQ_PORT ?? 5672);
    const user = process.env.RABBITMQ_USER ?? 'guest';
    const pass = process.env.RABBITMQ_PASSWORD ?? 'guest';
    const urls = [`amqp://${encodeURIComponent(user)}:${encodeURIComponent(pass)}@${host}:${port}`];
    return {
        transport: Transport.RMQ,
        options: {
            urls,
            queue: 'billing.metering',
            queueOptions: { durable: true },
        },
    };
}

/**
 * Metering service for Pay-As-You-Go VPS consumption
 * 
 * This service:
 * 1. Runs periodically to check all running PAYG VPS instances
 * 2. Calculates credit consumption based on runtime
 * 3. Deducts credits from user balance
 * 4. Stops VPS if balance hits zero
 * 5. Stops SUBSCRIPTION VPS if subscription lapses
 * 6. Publishes events for the notification service to consume
 */
@Injectable()
export class MeteringService {
    private readonly logger = new Logger(MeteringService.name);

    private readonly pricing = {
        cpuPerHour: 1,
        ramPerGbPerHour: 0.5,
        diskPerGbPerHour: 0.1,
    };

    constructor(
        private readonly prisma: PrismaService,
        private readonly creditService: CreditService,
    ) { }

    @Cron(CronExpression.EVERY_5_MINUTES)
    async meterRunningVps() {
        this.logger.log('Starting VPS metering cycle');

        try {
            const runningPaygVps = await this.prisma.cloudDeployment.findMany({
                where: {
                    billingMode: BillingMode.PAY_AS_YOU_GO,
                    status: CloudDeploymentStatus.RUNNING,
                },
                include: {
                    user: {
                        select: {
                            id: true,
                            creditBalance: true,
                            email: true,
                            name: true,
                        },
                    },
                },
            });

            this.logger.log(`Found ${runningPaygVps.length} running PAYG VPS instances to meter`);

            for (const vps of runningPaygVps) {
                await this.meterSingleVps(vps);
            }

            await this.enforceSubscriptionStatus();
        } catch (error) {
            this.logger.error('Error in metering cycle', error);
        }
    }

    private async meterSingleVps(vps: any) {
        try {
            const hoursElapsed = 0.0834; // 5 minutes in hours

            const cpuCost = vps.cpu * this.pricing.cpuPerHour * hoursElapsed;
            const ramCost = (vps.memory / 1024) * this.pricing.ramPerGbPerHour * hoursElapsed;
            const diskCost = (vps.storage / 1024) * this.pricing.diskPerGbPerHour * hoursElapsed;

            const totalCost = Math.round((cpuCost + ramCost + diskCost) * 100) / 100;

            this.logger.debug(`VPS ${vps.id} (${vps.name}): consuming ${totalCost} points`);

            if (vps.user.creditBalance < totalCost) {
                this.logger.warn(
                    `VPS ${vps.id} user has insufficient balance (${vps.user.creditBalance} < ${totalCost}), stopping VPS`,
                );
                await this.stopVpsForInsufficientBalance(vps.id, vps.userId, vps.user, totalCost);
                return;
            }

            await this.creditService.consume(vps.userId, vps.id, totalCost, {
                meteringPeriod: '5min',
                cpuCost,
                ramCost,
                diskCost,
                timestamp: new Date().toISOString(),
            });

            const newBalance = await this.creditService.getBalance(vps.userId);
            await this.checkLowBalanceWarning(vps.userId, newBalance, vps.id, vps.user);
        } catch (error) {
            this.logger.error(`Error metering VPS ${vps.id}`, error);
        }
    }

    private async stopVpsForInsufficientBalance(vpsId: string, userId: string, user: any, attemptedDeduction: number) {
        await this.prisma.cloudDeployment.update({
            where: { id: vpsId },
            data: {
                status: CloudDeploymentStatus.STOPPED,
                statusMessage: 'Stopped: insufficient credit balance. Top up to restart.',
                suspendedAt: new Date(),
            },
        });

        try {
            await this.creditService.consume(userId, vpsId, 0, {
                meteringPeriod: '5min',
                reason: 'insufficient_balance_zero_deduction',
                balanceBeforeStop: user.creditBalance,
                attemptedDeduction,
            });
        } catch {
            // Balance already at zero
        }

        this.publishEvent({
            type: 'vps.stopped.insufficient_balance',
            vpsId,
            userId,
            userName: user.name,
            userEmail: user.email,
            balance: user.creditBalance,
            timestamp: new Date().toISOString(),
        });

        this.logger.log(`VPS ${vpsId} stopped due to zero balance`);
    }

    private async checkLowBalanceWarning(userId: string, balance: number, vpsId: string, user: any) {
        const warningThreshold = 50;

        if (balance < warningThreshold && balance > 0) {
            this.publishEvent({
                type: 'vps.low_balance',
                vpsId,
                userId,
                userName: user.name,
                userEmail: user.email,
                balance,
                threshold: warningThreshold,
                timestamp: new Date().toISOString(),
            });

            this.logger.warn(`User ${userId} has low balance (${balance} points)`);
        }
    }

    private async enforceSubscriptionStatus() {
        const lapsedStatuses = ['PAST_DUE', 'CANCELED', 'EXPIRED', 'INCOMPLETE'];

        const affectedVps = await this.prisma.cloudDeployment.findMany({
            where: {
                billingMode: BillingMode.SUBSCRIPTION,
                status: CloudDeploymentStatus.RUNNING,
                user: {
                    subscriptionStatus: {
                        in: lapsedStatuses as never[],
                    },
                },
            },
            include: {
                user: {
                    select: {
                        id: true,
                        subscriptionStatus: true,
                        email: true,
                        name: true,
                    },
                },
            },
        });

        for (const vps of affectedVps) {
            this.logger.warn(
                `Stopping SUBSCRIPTION VPS ${vps.id} due to lapsed subscription (${vps.user.subscriptionStatus})`,
            );

            await this.prisma.cloudDeployment.update({
                where: { id: vps.id },
                data: {
                    status: CloudDeploymentStatus.STOPPED,
                    statusMessage: `Stopped: subscription ${vps.user.subscriptionStatus}. Please resubscribe to restart.`,
                    suspendedAt: new Date(),
                },
            });

            this.publishEvent({
                type: 'vps.stopped.subscription_lapsed',
                vpsId: vps.id,
                vpsName: vps.name,
                userId: vps.userId,
                userName: vps.user.name,
                userEmail: vps.user.email,
                subscriptionStatus: vps.user.subscriptionStatus,
                timestamp: new Date().toISOString(),
            });
        }
    }

    async estimateRuntimeRemaining(vpsId: string): Promise<number> {
        const vps = await this.prisma.cloudDeployment.findUnique({
            where: { id: vpsId },
            include: {
                user: {
                    select: { creditBalance: true },
                },
            },
        });

        if (!vps || vps.billingMode !== BillingMode.PAY_AS_YOU_GO) {
            return -1;
        }

        const hoursElapsed = 1;
        const cpuCost = vps.cpu * this.pricing.cpuPerHour * hoursElapsed;
        const ramCost = (vps.memory / 1024) * this.pricing.ramPerGbPerHour * hoursElapsed;
        const diskCost = (vps.storage / 1024) * this.pricing.diskPerGbPerHour * hoursElapsed;
        const costPerHour = cpuCost + ramCost + diskCost;

        if (costPerHour === 0) return Infinity;

        return Math.round((vps.user.creditBalance / costPerHour) * 100) / 100;
    }

    private publishEvent(payload: Record<string, unknown>) {
        const publisher = ClientProxyFactory.create(meteringEventsConfig());
        lastValueFrom(publisher.emit('billing.metering', payload)).catch((e) =>
            this.logger.warn(`Failed to publish metering event: ${e}`),
        );
    }
}
