import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { AppModule } from './app.module';

/**
 * Fail fast in production if the JWT secret is missing or too weak, so a
 * deployment can never silently ship with a guessable signing key. Runs before
 * the app is created (and thus before the database connection is attempted) so
 * a bad secret is reported as a secret error, not a connection error.
 *
 * In production the secret is expected to come from the environment (orchestrator
 * secret, Docker `environment:`, etc.), not a `.env` file.
 */
function assertProductionSecret(): void {
  if (process.env.NODE_ENV !== 'production') return;

  const secret = process.env.JWT_SECRET ?? '';
  if (secret.length < 32) {
    throw new Error(
      'JWT_SECRET must be set to a strong random value (>= 32 characters) when NODE_ENV=production.',
    );
  }

  if (/change-me|dev-only-insecure/i.test(secret)) {
    // eslint-disable-next-line no-console
    console.warn(
      '[security] WARNING: using a placeholder JWT_SECRET. Set a strong random value before deploying.',
    );
  }
}

async function bootstrap() {
  assertProductionSecret();

  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  // Shut down cleanly on SIGTERM/SIGINT (closes the Prisma connection pool).
  app.enableShutdownHooks();

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

  const port = Number(config.get<string>('PORT')) || 3001;
  await app.listen(port);
}

void bootstrap();