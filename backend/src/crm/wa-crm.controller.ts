import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { WaCrmService } from './wa-crm.service';

@ApiTags('CRM')
@Controller('crm')
export class WaCrmController {
  constructor(private waCrm: WaCrmService) {}

  @Get('features')
  getFeatures() {
    return this.waCrm.getFeatures();
  }
}
