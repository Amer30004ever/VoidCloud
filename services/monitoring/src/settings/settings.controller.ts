import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Put,
  UseGuards,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { CurrentUser } from '../decorators/current-user.decorator';

const MAINT_ENABLED = 'maintenance.enabled';
const MAINT_MESSAGE = 'maintenance.message';

/**
 * Platform-wide settings — currently exposes maintenance mode toggle for Super Admin.
 * Public GET so the app shell can render the banner without auth.
 */
@Controller('platform/maintenance')
export class SettingsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async get() {
    const [enabled, message] = await Promise.all([
      this.prisma.platformSetting.findUnique({ where: { key: MAINT_ENABLED } }),
      this.prisma.platformSetting.findUnique({ where: { key: MAINT_MESSAGE } }),
    ]);
    return {
      enabled: enabled?.value === 'true',
      message: message?.value ?? '',
      updatedAt: enabled?.updatedAt ?? null,
    };
  }

  @Put()
  @UseGuards(JwtAuthGuard)
  async set(
    @Body() body: { enabled: boolean; message?: string },
    @CurrentUser() user: { id: string; role: string },
  ) {
    if (user?.role !== 'SUPER_ADMIN') throw new ForbiddenException('Super admin only');
    await this.prisma.platformSetting.upsert({
      where: { key: MAINT_ENABLED },
      create: { key: MAINT_ENABLED, value: String(!!body.enabled), valueType: 'boolean', updatedBy: user.id },
      update: { value: String(!!body.enabled), updatedBy: user.id },
    });
    await this.prisma.platformSetting.upsert({
      where: { key: MAINT_MESSAGE },
      create: { key: MAINT_MESSAGE, value: body.message ?? '', valueType: 'string', updatedBy: user.id },
      update: { value: body.message ?? '', updatedBy: user.id },
    });
    return this.get();
  }
}
