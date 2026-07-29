import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export interface SwaggerConfig {
  title: string;
  description: string;
  version: string;
}

export function setupSwagger(app: INestApplication, config: SwaggerConfig) {
  const doc = new DocumentBuilder()
    .setTitle(config.title)
    .setDescription(config.description)
    .setVersion(config.version)
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, doc);
  SwaggerModule.setup('docs', app, document, {
    explorer: true,
    swaggerOptions: { persistAuthorization: true },
  });
}
