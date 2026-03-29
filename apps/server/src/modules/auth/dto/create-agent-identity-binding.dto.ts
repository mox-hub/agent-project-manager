import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateAgentIdentityBindingDto {
  @ApiProperty({
    description: 'Subject type for the mapped identity',
    enum: ['external_agent'],
    default: 'external_agent',
  })
  @IsString()
  @IsIn(['external_agent'])
  subjectType: 'external_agent' = 'external_agent';

  @ApiProperty({
    description: 'Stable subject identifier from provider/runtime',
    example: 'agent_cli_codex_01',
  })
  @IsString()
  @MaxLength(128)
  subjectId!: string;

  @ApiProperty({
    description: 'External provider identifier',
    example: 'codex',
  })
  @IsString()
  @MaxLength(64)
  providerId!: string;

  @ApiProperty({
    description: 'Identity source channel',
    enum: ['cli', 'mcp', 'api', 'plugin'],
    default: 'cli',
  })
  @IsString()
  @IsIn(['cli', 'mcp', 'api', 'plugin'])
  identitySource: 'cli' | 'mcp' | 'api' | 'plugin' = 'cli';

  @ApiPropertyOptional({
    description: 'Mapped project role for this external agent',
    example: 'fullstack_dev',
  })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  mappedRole?: string;

  @ApiPropertyOptional({
    description: 'Mapped capability level for this external agent',
    example: 'junior',
  })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  mappedLevel?: string;

  @ApiPropertyOptional({
    description: 'Binding status',
    enum: ['active', 'disabled'],
    default: 'active',
  })
  @IsOptional()
  @IsString()
  @IsIn(['active', 'disabled'])
  status?: 'active' | 'disabled';

  @ApiPropertyOptional({
    description: 'Additional metadata for integration or runtime hints',
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
