import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsPhoneNumber, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'nguoiban@369.vn' })
  @IsEmail({}, { message: 'Email không hợp lệ' })
  email: string;

  @ApiProperty({ example: '0987654321', required: false })
  @IsOptional()
  @IsPhoneNumber('VN', { message: 'Số điện thoại không hợp lệ' })
  phone?: string;

  @ApiProperty({ example: 'MatKhau@123' })
  @MinLength(8, { message: 'Mật khẩu tối thiểu 8 ký tự' })
  password: string;

  @ApiProperty({ example: 'Nguyễn Văn A' })
  @IsNotEmpty({ message: 'Họ tên không được để trống' })
  fullName: string;
}
