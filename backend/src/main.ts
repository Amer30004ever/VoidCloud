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

  // CORS - Allow configured origins + sensible defaults
  const envOrigins = (process.env.CORS_ORIGINS || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  const allowedOrigins = Array.from(
    new Set(
      [
        process.env.FRONTEND_URL || 'http://localhost:3000',
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        'http://localhost:3001',
        'http://127.0.0.1:3001',
        // VoidCloud production domains
        'https://voidcloud.cc.cd',
        'https://www.voidcloud.cc.cd',
        'https://api.voidcloud.cc.cd',
        ...envOrigins,
      ].filter(Boolean),
    ),
  );

  // Allow any *.voidcloud.cc.cd subdomain (preview / staging)
  const allowedOriginRegexes = [
    /^https:\/\/([a-z0-9-]+\.)*voidcloud\.cc\.cd$/i,
  ];

  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (curl, server-to-server, mobile)
      if (!origin) return callback(null, true);

      const allowed =
        allowedOrigins.includes(origin) ||
        allowedOriginRegexes.some((r) => r.test(origin)) ||
        process.env.NODE_ENV !== 'production';

      if (allowed) {
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
    .setTitle('AmerCloud Portal API')
    .setDescription(
      'AmerCloud hosting platform — Authentication, Cloud Plans, VPS provisioning, Payments, and more.',
    )
    .setVersion('1.0.0')
    .addTag('Health', 'Service health check')
    .addTag('Auth', 'User authentication & profile')
    .addTag('Webhook', 'WhatsApp Cloud API webhook endpoints')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'JWT',
    )
    .setContact('AmerCloud Team', 'https://voidcloud.cc.cd', 'support@voidcloud.cc.cd')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
    customSiteTitle: 'AmerCloud Portal — API Docs',
  });
  // ──────────────────────────────────────────────────────────────────────────

  const port = process.env.PORT ?? 3001;
  try {
    await seedCloud();
  } catch (e) {
    logger.warn(`Cloud seed skipped: ${(e as Error).message}`);
  }
  await app.listen(port);
  logger.log(`🚀 MaVoid CRM API running on http://localhost:${port}/api/v1`);
  logger.log(`📖 Swagger docs available at http://localhost:${port}/api/docs`);
  logger.log(`🌐 CORS allowed origins: ${allowedOrigins.join(', ')}`);
}
bootstrap();
