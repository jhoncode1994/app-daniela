import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { timingSafeEqual } from 'crypto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly config: ConfigService,
    private readonly jwt: JwtService,
  ) {}

  login(dto: LoginDto) {
    const username = this.config.getOrThrow<string>('ADMIN_USERNAME');
    const password = this.config.getOrThrow<string>('ADMIN_PASSWORD');

    if (!safeEqual(dto.username, username) || !safeEqual(dto.password, password)) {
      throw new UnauthorizedException('Usuario o contraseña incorrectos');
    }

    const accessToken = this.jwt.sign({
      sub: 'admin',
      username,
    });

    return { accessToken, username };
  }
}

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }
  return timingSafeEqual(leftBuffer, rightBuffer);
}
