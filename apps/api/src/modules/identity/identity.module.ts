import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth/auth.controller';
import { AuthService } from './auth/auth.service';
import { JwtStrategy } from './auth/strategies/jwt.strategy';
import { UsersService } from './users/users.service';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get('jwt.accessSecret'),
        signOptions: { expiresIn: config.get('jwt.accessExpiresIn') },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, UsersService, JwtStrategy],
  exports: [UsersService],
})
export class IdentityModule {}
