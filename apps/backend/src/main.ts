import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import compression from 'compression';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  // Logger
  app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER));

  // Configuration
  const configService = app.get(ConfigService);
  const port = configService.get<number>('API_PORT', 3000);
  const apiPrefix = configService.get<string>('API_PREFIX', '/api');
  const corsOrigin = configService.get<string>('CORS_ORIGIN', 'http://localhost:3001');

  // Global Prefix
  app.setGlobalPrefix(apiPrefix);

  // API Versioning
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  // Security - Helmet
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", 'data:', 'https:'],
        },
      },
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
      },
    }),
  );

  // Compression
  app.use(compression());

  // CORS
  app.enableCors({
    origin: corsOrigin,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID', 'X-Client-Version'],
  });

  // Global Validation Pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Swagger Documentation
  if (process.env['NODE_ENV'] !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('CDCP API')
      .setDescription('Construction Digital Control Platform - REST API Documentation')
      .setVersion('1.0.0')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          name: 'Authorization',
          description: 'Enter JWT token from Auth0',
          in: 'header',
        },
        'JWT-auth',
      )
      .addTag('auth', '認証・認可')
      .addTag('users', 'ユーザー管理')
      .addTag('organizations', '組織管理')
      .addTag('projects', '案件管理')
      .addTag('photos', '写真管理')
      .addTag('schedules', '工程管理')
      .addTag('costs', '原価管理')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup(`${apiPrefix}/docs`, app, document, {
      swaggerOptions: {
        persistAuthorization: true,
      },
    });

    console.log(`📚 Swagger UI: http://localhost:${port}${apiPrefix}/docs`);
  }

  // Graceful Shutdown
  app.enableShutdownHooks();

  await app.listen(port);

  console.log(`🚀 CDCP API Server running on http://localhost:${port}${apiPrefix}`);
  console.log(`🌍 Environment: ${process.env['NODE_ENV'] ?? 'development'}`);
}

void bootstrap();
