import { Body, Controller, Get, HttpCode, Param, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { CurrentUser } from '../decorators/current-user.decorator';
import { Public } from '../decorators/public.decorator';
import { UpdateCicdInput, VpsCicdService } from './vps-cicd.service';

@Controller('vps/:id/cicd')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiTags('VPS CI/CD')
@ApiBearerAuth()
export class VpsCicdController {
  constructor(private readonly cicd: VpsCicdService) {}

  @Get()
  @Roles(Role.USER, Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get CI/CD config (webhook secret shown once on first read)' })
  get(@Param('id') id: string, @CurrentUser() user: { id: string; role: Role }) {
    return this.cicd.get(id, user);
  }

  @Put()
  @Roles(Role.USER, Role.ADMIN, Role.SUPER_ADMIN)
  update(@Param('id') id: string, @Body() body: UpdateCicdInput, @CurrentUser() user: { id: string; role: Role }) {
    return this.cicd.update(id, body, user);
  }

  @Post('webhook/regenerate')
  @Roles(Role.USER, Role.ADMIN, Role.SUPER_ADMIN)
  regenerate(@Param('id') id: string, @CurrentUser() user: { id: string; role: Role }) {
    return this.cicd.regenerate(id, user);
  }

  @Get('runs')
  @Roles(Role.USER, Role.ADMIN, Role.SUPER_ADMIN)
  runs(@Param('id') id: string, @Query('limit') limit: string, @CurrentUser() user: { id: string; role: Role }) {
    return this.cicd.runs(id, user, Number(limit) || 20);
  }

  @Post('deploy')
  @Roles(Role.USER, Role.ADMIN, Role.SUPER_ADMIN)
  deploy(@Param('id') id: string, @Body() body: { ref?: string }, @CurrentUser() user: { id: string; role: Role }) {
    return this.cicd.triggerManual(id, user, body?.ref);
  }
}

/** Unauthenticated deploy hook — the HMAC signature is the only credential. */
@Controller('public/deploy')
@Public()
@ApiTags('VPS CI/CD')
export class PublicDeployController {
  constructor(private readonly cicd: VpsCicdService) {}

  @Post(':token')
  @HttpCode(202)
  hook(@Param('token') token: string, @Req() req: any) {
    const raw = req.rawBody ? req.rawBody.toString('utf8') : JSON.stringify(req.body ?? {});
    return this.cicd.handleWebhook(token, raw, req.headers ?? {});
  }
}
