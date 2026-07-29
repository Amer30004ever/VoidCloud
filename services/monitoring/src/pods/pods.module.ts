import { Module } from '@nestjs/common';
import { PodsController } from './pods.controller';
import { PodsGateway } from './pods.gateway';
import { PodsK8sService } from './pods.service';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule,
    JwtModule.register({}),
  ],
  controllers: [PodsController],
  providers: [PodsK8sService, PodsGateway],
})
export class PodsModule {}
