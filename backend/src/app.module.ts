import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { AuthorizationModule } from './authorization/authorization.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { BoardsModule } from './boards/boards.module';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { HealthController } from './health/health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    // Global in-memory rate limiting (200 req/min per IP). Auth endpoints
    // tighten this further via @Throttle().
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 200 }]),
    PrismaModule,
    AuthorizationModule,
    AuthModule,
    UsersModule,
    BoardsModule,
  ],
  controllers: [HealthController],
  providers: [
    // Rate limiting runs before authentication so login/register are covered.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    // Authentication is enforced globally; mark public routes with @Public().
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
})
export class AppModule {}