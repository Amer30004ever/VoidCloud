import { Body, Controller, Get, Param, Post, Query, UseGuards, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import * as speakeasy from 'speakeasy';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { CurrentUser } from '../decorators/current-user.decorator';
import { PodsK8sService } from './pods.service';
import { PrismaService } from '../prisma/prisma.service';

@Controller('pods')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiTags('Pods')
@ApiBearerAuth()
export class PodsController {
  constructor(
    private readonly k8s: PodsK8sService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('namespaces')
  @Roles(Role.SUPER_ADMIN)
  namespaces() {
    return { namespaces: ['voidcloud'] };
  }

  @Get('namespaces/:namespace')
  @Roles(Role.SUPER_ADMIN)
  list(@Param('namespace') namespace: string) {
    return this.k8s.listPods(namespace);
  }

  @Post('namespaces/:namespace/:name/restart')
  @Roles(Role.SUPER_ADMIN)
  async restart(
    @Param('namespace') namespace: string,
    @Param('name') name: string,
    @CurrentUser() user: { id: string; email: string },
    @Body() body: { password?: string; totpCode?: string },
  ) {
    if (!body.password && !body.totpCode) {
      throw new BadRequestException('password or totpCode is required');
    }
    await this.verifyReauth(user.id, body.password, body.totpCode);

    const auditDetails: Record<string, unknown> = { namespace, pod: name, reauthMethod: body.password ? 'password' : 'totp' };
    if (user.impersonatedBy) {
      auditDetails.impersonatedBy = user.impersonatedBy;
    }
    await this.prisma.auditLog.create({
      data: {
        action: 'POD_RESTART_INITIATED',
        userId: user.id,
        userEmail: user.email,
        resource: `${namespace}/${name}`,
        details: auditDetails as Prisma.InputJsonValue,
      },
    });
    return this.k8s.restartDeployment(namespace, name);
  }

  @Get('namespaces/:namespace/:name/logs')
  @Roles(Role.SUPER_ADMIN)
  async logs(
    @Param('namespace') namespace: string,
    @Param('name') name: string,
    @Query('container') container?: string,
    @Query('tailLines') tailLines?: string,
  ) {
    const lines = tailLines ? parseInt(tailLines, 10) : 200;
    const log = await this.k8s.getLogStream(namespace, name, container, lines);
    return { podName: name, namespace, logs: log || '' };
  }

  private async verifyReauth(userId: string, password?: string, totpCode?: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, password: true, twoFactorEnabled: true, twoFactorSecret: true },
    });
    if (!user) throw new BadRequestException('User not found');

    if (password) {
      const ok = await bcrypt.compare(password, user.password);
      if (!ok) throw new UnauthorizedException('Password is incorrect');
    } else if (totpCode) {
      if (!user.twoFactorEnabled || !user.twoFactorSecret) {
        throw new BadRequestException('2FA is not enabled');
      }
      const ok = speakeasy.totp.verify({
        secret: user.twoFactorSecret,
        encoding: 'base32',
        token: totpCode,
        window: 1,
      });
      if (!ok) throw new UnauthorizedException('2FA code is incorrect');
    }
  }
}
