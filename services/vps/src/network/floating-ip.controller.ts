import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { Role } from '@prisma/client';
import { FloatingIpService } from './floating-ip.service';

@Controller('floating-ips')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiTags('Floating IPs')
@ApiBearerAuth()
export class FloatingIpController {
  constructor(private readonly floatingIps: FloatingIpService) {}

  @Get()
  @ApiOperation({ summary: 'List floating IPs reserved by the caller' })
  async list(@Req() req: any) {
    return this.floatingIps.listForUser(req.user.id);
  }

  @Post('reserve')
  @ApiOperation({ summary: 'Reserve the next available IPv4/IPv6 address' })
  async reserve(@Req() req: any, @Body() body: { ipVersion?: 4 | 6; poolName?: string }) {
    return this.floatingIps.reserve(req.user.id, {
      ipVersion: body?.ipVersion === 6 ? 6 : 4,
      poolName: body?.poolName,
    });
  }

  @Post(':id/assign')
  @ApiOperation({ summary: 'Attach a reserved floating IP to one of the caller VPS instances' })
  async assign(@Req() req: any, @Param('id') id: string, @Body() body: { vpsId: string }) {
    return this.floatingIps.assign(req.user.id, id, body.vpsId);
  }

  @Post(':id/unassign')
  @ApiOperation({ summary: 'Detach a floating IP but keep the reservation' })
  async unassign(@Req() req: any, @Param('id') id: string) {
    return this.floatingIps.unassign(req.user.id, id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Release a floating IP back to the pool' })
  async release(@Req() req: any, @Param('id') id: string) {
    return this.floatingIps.release(req.user.id, id);
  }

  @Post('pool/import')
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Import addresses into a floating IP pool — SUPER_ADMIN only' })
  async importPool(
    @Body() body: { poolName?: string; cidr?: string; addresses?: string[]; gateway?: string },
  ) {
    return this.floatingIps.importPool(body ?? {});
  }

  @Get('pool/inventory')
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Floating IP pool inventory counts — SUPER_ADMIN only' })
  async inventory() {
    return this.floatingIps.inventory();
  }
}
