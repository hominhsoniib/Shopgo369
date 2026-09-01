import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'nguoiban@369.vn' })
  @IsEmail({}, { message: 'Email không hợp lệ' })
  email: string;

  @ApiProperty({ example: 'MatKhau@123' })
  @IsNotEmpty({ message: 'Mật khẩu không được để trống' })
  password: string;
}
