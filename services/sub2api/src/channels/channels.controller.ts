import { Controller, Get, UseGuards } from '@nestjs/common';
import { ChannelsService } from './channels.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RoleGuard } from '../auth/guards/role.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('channels')
@UseGuards(JwtAuthGuard, RoleGuard)
export class ChannelsController {
  constructor(private readonly channelsService: ChannelsService) {}

  @Get()
  @Roles('admin', 'super_admin')
  async getChannels() {
    return this.channelsService.getChannels();
  }
}
