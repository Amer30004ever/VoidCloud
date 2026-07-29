import { MiddlewareConsumer, Module, NestModule, Optional } from '@nestjs/common';
import { ApiUsageMiddleware } from './api-usage.middleware';

@Module({
  providers: [ApiUsageMiddleware],
  exports: [ApiUsageMiddleware],
})
export class ApiUsageModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(ApiUsageMiddleware).forRoutes('*');
  }
}
