import { Module } from '@nestjs/common';
import { TenantsController } from './tenants.controller';
import { TenantsService } from './tenants.service';
import { CatalogService } from '../catalog/catalog.service';
import { CatalogController } from '../catalog/catalog.controller';
import { ResellerService } from '../reseller/reseller.service';
import { ResellerController } from '../reseller/reseller.controller';

@Module({
  controllers: [TenantsController, CatalogController, ResellerController],
  providers: [TenantsService, CatalogService, ResellerService],
  exports: [CatalogService, ResellerService],
})
export class TenantsModule {}
