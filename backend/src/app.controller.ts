import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse } from '@nestjs/swagger';
import { Public } from './auth/decorators/public.decorator';

@ApiTags('Health')
@Controller()
export class AppController {
  /**
   * GET /api/v1/health
   * Quick service liveness check
   */
  @Public()
  @Get('health')
  @ApiOperation({ summary: 'Health check', description: 'Returns service status and uptime.' })
  @ApiOkResponse({
    description: 'Service is healthy',
    schema: {
      example: {
        status: 'ok',
        uptime: 42.5,
        timestamp: '2026-05-12T13:00:00.000Z',
      },
    },
  })
  health() {
    return {
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  }
}

