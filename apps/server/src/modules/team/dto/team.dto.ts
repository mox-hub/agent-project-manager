import {
  IsString,
  IsOptional,
  IsArray,
  IsEnum,
  IsDateString,
  IsEmail,
  IsBoolean,
  IsInt,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTeamDto {
  @ApiProperty({ description: 'Team name', example: '核心团队' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Team slug (unique)', example: 'core-team' })
  @IsString()
  slug: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  avatarUrl?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  color?: string;

  @ApiProperty({ required: false, description: '团队提示词（任务上下文注入的团队规则）' })
  @IsString()
  @IsOptional()
  teamPrompt?: string;

  @ApiProperty({ required: false, description: '标签', type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];
}

export class UpdateTeamDto {
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  avatarUrl?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  color?: string;

  @ApiProperty({ required: false, description: '团队提示词（任务上下文注入的团队规则）' })
  @IsString()
  @IsOptional()
  teamPrompt?: string;

  @ApiProperty({ required: false, description: '标签', type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @ApiProperty({ required: false, enum: ['active', 'archived'] })
  @IsEnum(['active', 'archived'])
  @IsOptional()
  status?: string;
}

export class AddTeamMemberDto {
  @ApiProperty({ description: 'Member id' })
  @IsString()
  memberId: string;

  @ApiProperty({
    enum: ['owner', 'maintainer', 'member', 'guest'],
    required: false,
  })
  @IsEnum(['owner', 'maintainer', 'member', 'guest'])
  @IsOptional()
  role?: string;
}

export class UpdateTeamMemberDto {
  @ApiProperty({ enum: ['owner', 'maintainer', 'member', 'guest'] })
  @IsEnum(['owner', 'maintainer', 'member', 'guest'])
  role: string;
}

export class BindTeamProjectDto {
  @ApiProperty()
  @IsString()
  projectId: string;

  @ApiProperty({
    enum: ['owner', 'maintainer', 'contributor', 'viewer'],
    required: false,
  })
  @IsEnum(['owner', 'maintainer', 'contributor', 'viewer'])
  @IsOptional()
  role?: string;
}

export class CreateTeamInviteDto {
  @ApiProperty({ required: false })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  memberId?: string;

  @ApiProperty({
    enum: ['owner', 'maintainer', 'member', 'guest'],
    required: false,
  })
  @IsEnum(['owner', 'maintainer', 'member', 'guest'])
  @IsOptional()
  role?: string;

  @ApiProperty({ required: false, description: 'ISO date string' })
  @IsDateString()
  @IsOptional()
  expiresAt?: string;
}
