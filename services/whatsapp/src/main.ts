import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(3007);
  console.log('WhatsApp service is running on port 3007');
}
bootstrap();
