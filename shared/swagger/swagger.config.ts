import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export interface SwaggerOptions {
  title: string;
  description: string;
  version: string;
}

export function setupSwagger(app: INestApplication, options: SwaggerOptions) {
  const config = new DocumentBuilder()
    .setTitle(options.title)
    .setDescription(options.description)
    .setVersion(options.version)
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);
}
