import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { PlatformSecretsService, CreateSecretDto, UpdateSecretDto } from './platform-secrets.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { CurrentUser } from '../decorators/current-user.decorator';

@Controller('monitoring/secrets')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PlatformSecretsController {
  constructor(private readonly secrets: PlatformSecretsService) {}

  @Get()
  @Roles(Role.SUPER_ADMIN)
  list() {
    return this.secrets.list();
  }

  @Post()
  @Roles(Role.SUPER_ADMIN)
  async create(
    @Body() body: CreateSecretDto,
    @CurrentUser() user: { id: string; impersonatedBy?: string },
  ) {
    if (!body.key || !body.value) {
      throw new BadRequestException('key and value are required');
    }
    return this.secrets.create(body, user.id);
  }

  @Get(':id/reveal')
  @Roles(Role.SUPER_ADMIN)
  async reveal(@Param('id') id: string) {
    return this.secrets.getReveal(id);
  }

  @Delete(':id')
  @Roles(Role.SUPER_ADMIN)
  async remove(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    const ok = await this.secrets.delete(id);
    if (!ok) {
      throw new BadRequestException('Secret not found');
    }
    return { success: true };
  }
}
