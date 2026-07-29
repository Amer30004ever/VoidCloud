import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { CurrentUser } from '../decorators/current-user.decorator';
import { WebhooksService } from './webhooks.service';

@Controller('cloud/webhooks')
@UseGuards(JwtAuthGuard)
@ApiTags('Webhooks')
@ApiBearerAuth()
export class WebhooksController {
  constructor(private readonly webhooks: WebhooksService) {}

  @Get('events')
  events() {
    return this.webhooks.events();
  }

  @Get()
  list(@CurrentUser() user: { id: string }) {
    return this.webhooks.list(user.id);
  }

  @Post()
  create(
    @CurrentUser() user: { id: string },
    @Body() body: { name: string; url: string; events: string[]; enabled?: boolean },
  ) {
    return this.webhooks.create(user.id, body);
  }

  @Put(':id')
  update(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body()
    body: Partial<{
      name: string;
      url: string;
      events: string[];
      enabled: boolean;
      regenerateSecret: boolean;
    }>,
  ) {
    return this.webhooks.update(user.id, id, body);
  }

  @Delete(':id')
  remove(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.webhooks.remove(user.id, id);
  }

  @Post(':id/test')
  test(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.webhooks.test(user.id, id);
  }

  @Get(':id/deliveries')
  deliveries(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Query('limit') limit?: string,
  ) {
    return this.webhooks.deliveries(user.id, id, limit ? Number(limit) : 50);
  }

  @Post(':id/deliveries/:deliveryId/resend')
  resend(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Param('deliveryId') deliveryId: string,
  ) {
    return this.webhooks.resend(user.id, id, deliveryId);
  }
}
