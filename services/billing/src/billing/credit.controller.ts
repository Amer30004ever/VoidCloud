import { Controller, Get, Post, Body, Query, UseGuards, Req, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { CreditService } from './credit.service';
import { PaymentService } from '../payments/payment.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { Role, BillingMode } from '@prisma/client';
import { PaymentMethod } from '../payments/gateway';

@Controller('credits')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiTags('Credits')
@ApiBearerAuth()
export class CreditController {
    constructor(
        private readonly creditService: CreditService,
        private readonly paymentService: PaymentService,
        private readonly prisma: PrismaService,
    ) { }

    /**
     * Get current user's credit balance
     */
    @Get('balance')
    async getBalance(@Req() req: any) {
        const userId = req.user.id;
        const balance = await this.creditService.getBalance(userId);
        return { balance, userId };
    }

    /**
     * Get transaction history
     */
    @Get('transactions')
    async getTransactions(
        @Req() req: any,
        @Query('limit') limit?: string,
        @Query('offset') offset?: string,
    ) {
        const userId = req.user.id;
        const transactions = await this.creditService.getTransactionHistory(
            userId,
            limit ? parseInt(limit, 10) : 50,
            offset ? parseInt(offset, 10) : 0,
        );
        return { transactions, count: transactions.length };
    }

    /**
     * Purchase credit pack (creates invoice, initiates payment flow)
     */
    @Post('purchase')
    async purchaseCredits(
        @Req() req: any,
        @Body() body: { packSize: 'small' | 'medium' | 'large'; paymentMethod: PaymentMethod },
    ) {
        const userId = req.user.id;

        const packs = {
            small: { points: 100, priceUSD: 10, priceEGP: 500 },
            medium: { points: 300, priceUSD: 25, priceEGP: 1250 },
            large: { points: 1000, priceUSD: 75, priceEGP: 3750 },
        };

        const pack = packs[body.packSize];
        if (!pack) {
            throw new BadRequestException('Invalid pack size');
        }

        const currency = 'EGP';
        const amount = pack.priceEGP;

        const number = `CREDIT-${Date.now().toString(36).toUpperCase()}`;
        const dueDate = new Date(Date.now() + 7 * 86400000);

        const invoice = await this.prisma.cloudInvoice.create({
            data: {
                userId,
                number,
                amountUSD: pack.priceUSD,
                amountEGP: pack.priceEGP,
                currency,
                description: `Credit pack: ${body.packSize} (${pack.points} points)`,
                dueDate,
                status: 'PENDING',
                metadata: {
                    packSize: body.packSize,
                    points: pack.points,
                    paymentMethod: body.paymentMethod,
                } as never,
            },
        });

        const checkout = await this.paymentService.checkout({
            userId,
            invoiceId: invoice.id,
            method: body.paymentMethod,
        });

        return {
            invoiceId: invoice.id,
            points: pack.points,
            checkout,
        };
    }

    /**
     * Manual credit adjustment (SUPER_ADMIN only)
     */
    @Post('adjust')
    @Roles(Role.SUPER_ADMIN)
    async adjustCredits(
        @Req() req: any,
        @Body() body: { userId: string; amount: number; reason: string },
    ) {
        const adminId = req.user.id;
        const result = await this.creditService.adjust(
            body.userId,
            body.amount,
            body.reason,
            adminId,
        );
        return {
            success: true,
            newBalance: result.newBalance,
            transactionId: result.transactionId,
        };
    }

    /**
     * Check if user can start a PAYG VPS
     */
    @Get('can-start-vps')
    async canStartVps(@Req() req: any, @Query('billingMode') mode?: string) {
        const userId = req.user.id;
        const billingMode = (mode as BillingMode) || BillingMode.PAY_AS_YOU_GO;

        const result = await this.creditService.canProvisionVps(userId, billingMode);
        return result;
    }
}
