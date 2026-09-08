import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, Length } from 'class-validator';

export class Verify2faDto {
  @ApiProperty({ example: '123456' })
  @IsNotEmpty()
  @Length(6, 6, { message: 'Mã xác thực phải có đúng 6 chữ số' })
  code: string;
}
