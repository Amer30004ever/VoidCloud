import { Controller, Get } from '@nestjs/common';

@Controller()
export class HealthController {
  constructor(private readonly serviceName: string) {}

  @Get('health')
  check() {
    return { status: 'ok', service: this.serviceName };
  }
}

export function createHealthController(serviceName: string) {
  @Controller()
  class ServiceHealthController {
    @Get('health')
    check() {
      return { status: 'ok', service: serviceName };
    }
  }
  return ServiceHealthController;
}
