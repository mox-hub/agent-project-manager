import {
  IsString,
  IsOptional,
  IsEnum,
  IsInt,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateMemberDto {
  @ApiProperty({ enum: ['human', 'ai_agent'], default: 'human' })
  @IsEnum(['human', 'ai_agent'])
  @IsOptional()
  type?: string = 'human';

  @ApiProperty()
  @IsString()
  displayName: string;

  @ApiProperty({ description: '@handle, unique', example: 'alice', required: false })
  @IsString()
  @IsOptional()
  handle?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  email?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  avatarUrl?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  userId?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  aiModelConfigId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  metadata?: Record<string, unknown>;

  @ApiProperty({ required: false, enum: ['active', 'inactive', 'suspended'] })
  @IsEnum(['active', 'inactive', 'suspended'])
  @IsOptional()
  status?: string = 'active';
}

export class UpdateMemberDto {
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  displayName?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  email?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  avatarUrl?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  aiModelConfigId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  metadata?: Record<string, unknown>;

  @ApiProperty({ required: false, enum: ['active', 'inactive', 'suspended'] })
  @IsEnum(['active', 'inactive', 'suspended'])
  @IsOptional()
  status?: string;
}

export class MemberQueryDto {
  @ApiProperty({ enum: ['human', 'ai_agent'], required: false })
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

  @ApiProperty({ enum: ['active', 'inactive', 'suspended'], required: false })
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
  @IsOptional()
  role?: string = 'member';
}
