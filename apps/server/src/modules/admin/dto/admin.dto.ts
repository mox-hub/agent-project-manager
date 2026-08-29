import {
  IsEmail,
  IsOptional,
  IsString,
  IsBoolean,
  IsInt,
  Min,
  Max,
  MaxLength,
  MinLength,
  IsIn,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateAdminUserDto {
  @ApiProperty({ example: '张三' })
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  displayName: string;

  @ApiProperty({ example: 'alice@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({
    required: false,
    example: 'alice',
    description: '登录名，缺省由邮箱前缀派生',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  @IsOptional()
  username?: string;

  @ApiProperty({
    required: false,
    enum: ['user', 'admin'],
    description: '全局角色',
  })
  @IsIn(['user', 'admin'])
  @IsOptional()
  role?: string;
}

export class UpdateAdminUserDto {
  @ApiProperty({ required: false })
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  @IsOptional()
  displayName?: string;

  @ApiProperty({ required: false })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiProperty({ required: false, description: '停用/启用账号' })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiProperty({
    required: false,
    description: '重置为随机密码（响应一次性返回）',
  })
  @IsBoolean()
  @IsOptional()
  resetPassword?: boolean;
}

export class CreateRegistrationInviteDto {
  @ApiProperty({
    required: false,
    description: '限定受邀邮箱；留空则任意邮箱可用',
  })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiProperty({ required: false, default: 7, description: '有效天数' })
  @IsInt()
  @Min(1)
  @Max(90)
  @IsOptional()
  expiresInDays?: number;
}
