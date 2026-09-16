import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class RefreshDto {
  // Optional — Web không gửi field này nữa (refresh token nằm trong cookie
  // httpOnly, đọc ở AuthController.refresh()); Mobile vẫn gửi trong body
  // như cũ (không có cookie).
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  refreshToken?: string;
}
