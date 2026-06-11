import { Module } from '@nestjs/common';
import { CloudPlansService } from './cloud-plans.service';
import { CloudDeploymentsService } from './cloud-deployments.service';
import { CloudBillingService } from './cloud-billing.service';
import { CloudAdminService } from './cloud-admin.service';
import {
  CloudPlansController,
  CloudDeploymentsController,
  CloudBillingController,
  CloudWebhooksController,
  CloudAdminController,
} from './cloud.controllers';

@Module({
  controllers: [
    CloudPlansController,
    CloudDeploymentsController,
    CloudBillingController,
    CloudWebhooksController,
    CloudAdminController,
  ],
  providers: [CloudPlansService, CloudDeploymentsService, CloudBillingService, CloudAdminService],
  exports: [CloudPlansService, CloudDeploymentsService, CloudBillingService],
})
export class CloudModule {}
