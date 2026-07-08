import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

const logger = new Logger('Bootstrap');

function validateEnvVars() {
  const required = [
    'JWT_SECRET',
    'DATABASE_URL',
    'SMTP_HOST',
    'SMTP_USER',
    'SMTP_PASS',
  ];
  const missing = required.filter(
    (key) =>
      !process.env[key] || process.env[key]?.startsWith('your_'),
  );
  if (missing.length > 0) {
    logger.error(`Missing: ${missing.join(', ')}`);
    process.exit(1);
  }
}

async function bootstrap() {
  validateEnvVars();
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.enableCors({
    origin: ['https://voidcloud.cc.cd', 'http://localhost:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  });
  const port = process.env.PORT ?? 3001;
  await app.listen(port);
  logger.log(`Auth Service running on port ${port}`);
}

bootstrap();
