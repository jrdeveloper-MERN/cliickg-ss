import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../database/prisma.service';

export interface JwtPayload {
  id: string;
  username: string;
  role: string;
  jti: string;
  iat?: number;
  exp?: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('jwt.secret'),
    });
  }

  async validate(payload: JwtPayload) {
    if (!payload || !payload.id || !payload.jti) {
      throw new UnauthorizedException({
        success: false,
        message: 'Unauthorized access. Valid token required.',
        errors: ['UNAUTHORIZED'],
      });
    }

    const session = await this.prisma.adminSession.findUnique({
      where: { jti: payload.jti },
    });

    if (!session || session.isRevoked || session.revokedAt || session.expiresAt < new Date()) {
      throw new UnauthorizedException({
        success: false,
        message: 'Unauthorized access. Token has been revoked or session expired.',
        errors: ['UNAUTHORIZED'],
      });
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.id },
      select: {
        id: true,
        username: true,
        role: true,
        accountStatus: true,
        isDeleted: true,
      },
    });

    if (!user || user.isDeleted || user.accountStatus === 'DISABLED') {
      throw new UnauthorizedException({
        success: false,
        message: 'Unauthorized access. User account is inactive or disabled.',
        errors: ['UNAUTHORIZED'],
      });
    }

    return {
      id: user.id,
      username: user.username,
      role: user.role,
      jti: payload.jti,
    };
  }
}

