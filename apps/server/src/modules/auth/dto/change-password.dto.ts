import { IsString, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChangePasswordDto {
  @ApiProperty({ description: '当前密码' })
  @IsString()
  @MaxLength(64)
  currentPassword: string;

  @ApiProperty({ minLength: 8, description: '新密码' })
  @IsString()
  @MinLength(8, { message: '新密码至少 8 位' })
  @MaxLength(64)
  newPassword: string;
}
