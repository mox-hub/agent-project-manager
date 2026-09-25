import {
  IsEmail,
  IsOptional,
  IsString,
  MinLength,
  MaxLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { IsValidDisplayName } from '@/common/utils/display-name.util';

export class RegisterDto {
  @ApiProperty({ example: 'alice@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8, { message: '密码至少 8 位' })
  @MaxLength(64)
  password: string;

  @ApiProperty({ required: false, example: '张三' })
  @IsString()
  @IsValidDisplayName()
  @IsOptional()
  displayName?: string;

  @ApiProperty({
    required: false,
    description: '注册邀请 token（invite 模式必填，open 模式可选）',
  })
  @IsString()
  @IsOptional()
  inviteToken?: string;
}
