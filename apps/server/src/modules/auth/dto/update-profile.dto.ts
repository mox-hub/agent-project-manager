import {
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateProfileDto {
  @ApiProperty({ required: false, example: '张三' })
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  @IsOptional()
  displayName?: string;

  @ApiProperty({ required: false, example: 'alice@example.com' })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiProperty({ required: false, description: '头像地址' })
  @IsString()
  @MaxLength(2048)
  @IsOptional()
  avatarUrl?: string;

  @ApiProperty({ required: false, example: 'Asia/Shanghai' })
  @IsString()
  @MaxLength(64)
  @IsOptional()
  timezone?: string;
}
