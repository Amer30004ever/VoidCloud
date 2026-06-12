import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { seedCloud } from './cloud/seed';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Bootstrap');

  // Global API prefix
  app.setGlobalPrefix('api/v1');

  // Auto-validate incoming DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // CORS - Allow multiple origins for development
  const allowedOrigins = [
    process.env.FRONTEND_URL || 'http://localhost:3000',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:3001',
    'http://127.0.0.1:3001',
	'https://amer-portal.cc.cd',
	'https://api.amer-portal.cc.cd',
  ].filter(Boolean);

  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl)
      if (!origin) return callback(null, true);
      
      if (allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production') {
        callback(null, true);
      } else {
        logger.warn(`Blocked CORS request from origin: ${origin}`);
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  });

  // ── Swagger / OpenAPI ──────────────────────────────────────────────────────
  const swaggerConfig = new DocumentBuilder()
    .setTitle('MaVoid CRM API')
    .setDescription(
      'WhatsApp CRM backend — Authentication, Webhooks, Conversations, Leads, Contacts, Deals, Tasks, Templates.',
    )
    .setVersion('1.0.0')
    .addTag('Health', 'Service health check')
    .addTag('Auth', 'User authentication & profile')
    .addTag('Webhook', 'WhatsApp Cloud API webhook endpoints')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'JWT',
    )
    .setContact('MaVoid Team', '', 'support@mavoid.com')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
    customSiteTitle: 'MaVoid CRM — API Docs',
  });
  // ──────────────────────────────────────────────────────────────────────────

  const port = process.env.PORT ?? 3001;
  try { await seedCloud(); } catch (e) { logger.warn(`Cloud seed skipped: ${(e as Error).message}`); }
  await app.listen(port);
  logger.log(`🚀 MaVoid CRM API running on http://localhost:${port}/api/v1`);
  logger.log(`📖 Swagger docs available at http://localhost:${port}/api/docs`);
  logger.log(`🌐 CORS allowed origins: ${allowedOrigins.join(', ')}`);
}
bootstrap();