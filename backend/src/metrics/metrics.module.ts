import { Module } from '@nestjs/common';
import { MetricsGateway } from './metrics.gateway';
import { PlatformModule } from '../platform/platform.module';

@Module({
  imports: [PlatformModule],
  providers: [MetricsGateway],
  exports: [MetricsGateway],
})
export class MetricsModule {}
