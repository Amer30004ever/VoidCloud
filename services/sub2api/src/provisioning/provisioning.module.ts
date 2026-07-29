import { Module } from '@nestjs/common';
import { SupabaseProvisioningService } from './supabase-provisioning.service';

@Module({
  providers: [SupabaseProvisioningService],
  exports: [SupabaseProvisioningService],
})
export class ProvisioningModule {}
