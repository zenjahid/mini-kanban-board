import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { User } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

export interface SafeUser {
  id: string;
  email: string;
  name: string;
}

export interface AuthResult {
  accessToken: string;
  user: SafeUser;
}

const BCRYPT_ROUNDS = 10;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResult> {
    const email = dto.email.toLowerCase().trim();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException('An account with this email already exists.');
    }

    const password = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const user = await this.prisma.user.create({
      data: {
        email,
        name: dto.name.trim(),
        password,
      },
    });

    return this.buildResult(user);
  }

  async login(dto: LoginDto): Promise<AuthResult> {
    const email = dto.email.toLowerCase().trim();
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    const valid = await bcrypt.compare(dto.password, user.password);
    if (!valid) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    return this.buildResult(user);
  }

  private buildResult(user: User): AuthResult {
    const payload: { sub: string; email: string } = {
      sub: user.id,
      email: user.email,
    };
    return {
      accessToken: this.jwt.sign(payload, {
        expiresIn: this.config.get<string>('JWT_EXPIRES_IN') ?? '7d',
      }),
      user: this.toSafeUser(user),
    };
  }

  private toSafeUser(user: User): SafeUser {
    return { id: user.id, email: user.email, name: user.name };
  }
}