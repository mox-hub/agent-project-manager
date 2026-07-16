import {
  IsString,
  IsOptional,
  IsArray,
  IsEnum,
  IsEmail,
  IsBoolean,
  IsInt,
  IsUrl,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateMemberDto {
  @ApiProperty({ enum: ['human', 'ai_agent'] })
  @IsEnum(['human', 'ai_agent'])
  type: string;

  @ApiProperty()
  @IsString()
  displayName: string;

  @ApiProperty({ description: '@handle, unique', example: 'alice' })
  @IsString()
  handle: string;

  @ApiProperty({ required: false })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiProperty({ required: false })
  @IsUrl({ require_tld: false })
  @IsOptional()
  avatarUrl?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  bio?: string;

  // human-only
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  userId?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  timezone?: string;

  // ai-only
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  aiModelConfigId?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  aiProvider?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  systemPrompt?: string;

  @ApiProperty({ required: false, type: [String] })
  @IsArray()
  @IsOptional()
  capabilities?: string[];

  @ApiProperty({ required: false, type: [String] })
  @IsArray()
  @IsOptional()
  tags?: string[];

  @ApiProperty({ required: false })
  @IsEnum(['active', 'inactive', 'suspended'])
  @IsOptional()
  status?: string;
}

export class UpdateMemberDto {
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  displayName?: string;

  @ApiProperty({ required: false })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiProperty({ required: false })
  @IsUrl({ require_tld: false })
  @IsOptional()
  avatarUrl?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  bio?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  timezone?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  aiModelConfigId?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  aiProvider?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  systemPrompt?: string;

  @ApiProperty({ required: false, type: [String] })
  @IsArray()
  @IsOptional()
  capabilities?: string[];

  @ApiProperty({ required: false, type: [String] })
  @IsArray()
  @IsOptional()
  tags?: string[];

  @ApiProperty({ required: false, enum: ['active', 'inactive', 'suspended'] })
  @IsEnum(['active', 'inactive', 'suspended'])
  @IsOptional()
  status?: string;

  @ApiProperty({ required: false })
  @IsBoolean()
  @IsOptional()
  isOnline?: boolean;
}

export class MemberQueryDto {
  @ApiProperty({ required: false, enum: ['human', 'ai_agent'] })
  @IsEnum(['human', 'ai_agent'])
  @IsOptional()
  type?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  q?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  projectId?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  teamId?: string;

  @ApiProperty({ required: false, enum: ['active', 'inactive', 'suspended'] })
  @IsEnum(['active', 'inactive', 'suspended'])
  @IsOptional()
  status?: string;

  @ApiProperty({ required: false })
  @IsInt()
  @IsOptional()
  limit?: number;

  @ApiProperty({ required: false })
  @IsInt()
  @IsOptional()
  offset?: number;
}

export class BindMemberProjectDto {
  @ApiProperty()
  @IsString()
  projectId: string;

  @ApiProperty({ enum: ['owner', 'maintainer', 'member', 'guest'] })
  @IsEnum(['owner', 'maintainer', 'member', 'guest'])
  role: string;
}
