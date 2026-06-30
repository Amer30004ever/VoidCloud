import { Module } from '@nestjs/common';
import { VpsController } from './vps.controller';
import { VpsService } from './vps.service';
import { ProxmoxService } from '../proxmox/proxmox.service';

@Module({
  controllers: [VpsController],
  providers: [VpsService, ProxmoxService],
})
export class VpsModule {}
