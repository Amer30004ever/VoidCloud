import { Module, OnModuleInit, Inject } from '@nestjs/common';
import { OidcProviderService } from './oidc-provider.service';

@Module({
  providers: [OidcProviderService],
  exports: [OidcProviderService],
})
export class OidcProviderModule implements OnModuleInit {
  constructor(@Inject(OidcProviderService) private readonly service: OidcProviderService) {}

  async onModuleInit() {
    await this.service.initialize();
  }
}
