import { Module } from '@nestjs/common';
import { PublicApiController } from './public-api.controller';
import { VpsModule } from '../vps/vps.module';
import { ApiKeyGuard } from '../guards/api-key.guard';
import { ScopesGuard } from '../guards/scope.guard';
import { RequireScopes } from '../decorators/scopes.decorator';

@Module({
  imports: [VpsModule],
  controllers: [PublicApiController],
  providers: [ApiKeyGuard, ScopesGuard],
  exports: [ApiKeyGuard, ScopesGuard],
})
export class PublicApiModule {}
