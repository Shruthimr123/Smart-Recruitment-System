import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from 'src/users/entities/user.entity';
import { Repository } from 'typeorm';

// this will handle actual token validation part
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService, @InjectRepository(User)
  private readonly userRepo: Repository<User>,) {
    super({
      // Extracts the token from Authorization: Bearer <token> header.
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      // If token is expired, throw error.
      ignoreExpiration: false,
      // Verify the token signature
      secretOrKey: configService.get<string>('JWT_SECRET_KEY'),
    });
  }

  // Runs only if the token is valid.
  // Gets the payload from the decoded JWT.
  // The return value here becomes req.user in all downstream controllers and guards.

  async validate(payload: any) {
    const user = await this.userRepo.findOne({
      where: { id: payload.id },
      relations: ['role'],
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Allow super admin always
    if (user.role?.name !== 'superadmin' && user.status === 'inactive') {

      throw new ForbiddenException("User is inactive");
    }

    return {
      id: user.id,
      email: user.email,
      role: user.role?.name,
      status: user.status,   // always trust DB, not payload
    };
  }
}

// How they’re works:
// JwtAuthGuard → calls AuthGuard('jwt')
// AuthGuard('jwt') → uses your registered JwtStrategy
// JwtStrategy.validate() → returns user info to JwtAuthGuard
// JwtAuthGuard.handleRequest() → decides what to do with that info (return it or throw error)
