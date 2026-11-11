import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { CurrentUser } from '../decorators/current-user.decorator';
import { LoadBalancerInput, LoadBalancerService } from './load-balancer.service';

@Controller('vps/load-balancers')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiTags('Load Balancers')
@ApiBearerAuth()
export class LoadBalancerController {
  constructor(private readonly lbs: LoadBalancerService) {}

  @Get()
  @Roles(Role.USER, Role.ADMIN, Role.SUPER_ADMIN)
  list(@Query('vpsId') vpsId: string | undefined, @CurrentUser() user: { id: string; role: Role }) {
    return this.lbs.list(user, vpsId);
  }

  @Post()
  @Roles(Role.USER, Role.ADMIN, Role.SUPER_ADMIN)
  create(@Body() body: LoadBalancerInput & { vpsId?: string }, @CurrentUser() user: { id: string; role: Role }) {
    return this.lbs.create(body, user);
  }

  @Patch(':lbId')
  @Roles(Role.USER, Role.ADMIN, Role.SUPER_ADMIN)
  update(@Param('lbId') id: string, @Body() body: LoadBalancerInput, @CurrentUser() user: { id: string; role: Role }) {
    return this.lbs.update(id, body, user);
  }

  @Delete(':lbId')
  @Roles(Role.USER, Role.ADMIN, Role.SUPER_ADMIN)
  remove(@Param('lbId') id: string, @CurrentUser() user: { id: string; role: Role }) {
    return this.lbs.remove(id, user);
  }
}
