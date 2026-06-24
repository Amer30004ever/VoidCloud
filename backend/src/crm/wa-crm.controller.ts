import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';
import { WaCrmService } from './wa-crm.service';

@ApiTags('CRM / WhatsApp')
@Controller('crm')
export class WaCrmController {
  constructor(private waCrm: WaCrmService) {}

  @Public()
  @Get('config')
  config() {
    return this.waCrm.getConfig();
  }
}
