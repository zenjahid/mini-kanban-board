import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  // Security headers (CSP, X-Frame-Options, no-sniff, etc.).
  app.use(helmet());

  // All routes are served under /api
  app.setGlobalPrefix('api');

  // The frontend authenticates with a JWT sent via the Authorization header,
  // so a permissive CORS policy is safe here. Restrict `origin` in production.
  app.enableCors({
    origin: config.get<string>('CORS_ORIGIN') ?? '*',
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  // Strip unknown fields and coerce types based on DTO class-validator metadata.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const port = config.get<number>('PORT') ?? 3001;
  await app.listen(port);
}

void bootstrap();