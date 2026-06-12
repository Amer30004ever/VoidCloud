import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse } from '@nestjs/swagger';
import { Public } from './auth/decorators/public.decorator';
import { PrismaService } from './prisma/prisma.service';

@ApiTags('Health')
@Controller()
export class AppController {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * GET /api/v1/health
   * Readiness check, including database connectivity
   */
  @Public()
  @Get('health')
  @ApiOperation({ summary: 'Health check', description: 'Returns service and database status.' })
  @ApiOkResponse({
    description: 'Service is healthy',
    schema: {
      example: {
        status: 'ok',
        database: 'ok',
        uptime: 42.5,
        timestamp: '2026-05-12T13:00:00.000Z',
      },
    },
  })
  async health() {
    return this.ready();
  }

  @Public()
  @Get('health/live')
  live() {
    return {
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  }

  @Public()
  @Get('health/ready')
  async ready() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return {
        status: 'ok',
        database: 'ok',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
      };
    } catch (_error) {
      throw new ServiceUnavailableException({
        status: 'error',
        database: 'unreachable',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
      });
    }
  }
}

