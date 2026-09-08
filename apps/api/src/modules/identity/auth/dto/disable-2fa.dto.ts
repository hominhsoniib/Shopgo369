import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, Length } from 'class-validator';

export class Disable2faDto {
  @ApiProperty({ description: 'Mật khẩu hiện tại — bắt buộc để xác nhận, tránh phiên bị chiếm dụng tự ý tắt 2FA' })
  @IsNotEmpty()
  password: string;

  @ApiProperty({ example: '123456' })
  @IsNotEmpty()
  @Length(6, 6, { message: 'Mã xác thực phải có đúng 6 chữ số' })
  code: string;
}
