import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

/**
 * JwtStrategy — verify access token, gắn payload (id, email, roles) vào
 * request.user để RolesGuard và @CurrentUser() sử dụng.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get('jwt.accessSecret') as string,
    });
  }

  async validate(payload: { sub: string; email: string; roles: string[] }) {
    return { id: payload.sub, email: payload.email, roles: payload.roles };
  }
}
