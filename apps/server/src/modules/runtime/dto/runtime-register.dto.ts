import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsOptional,
  IsString,
  IsObject,
  IsNotEmpty,
} from 'class-validator';

export class RuntimeRegisterDto {
  @ApiProperty({ example: 'runtime-local-001' })
  @IsString()
  @IsNotEmpty()
  runtimeId: string;

  @ApiProperty({ example: 'device-001' })
  @IsString()
  @IsNotEmpty()
  deviceId: string;

  @ApiProperty({ example: 'windows' })
  @IsString()
  @IsNotEmpty()
  hostPlatform: string;

  @ApiProperty({ example: '0.1.0' })
  @IsString()
  @IsNotEmpty()
  runtimeVersion: string;

  @ApiProperty({ example: '1.0.0' })
  @IsString()
  @IsNotEmpty()
  protocolVersion: string;

  @ApiProperty({
    type: [String],
    example: ['E:\\Project\\agent-project-manager'],
  })
  @IsArray()
  @IsString({ each: true })
  workspaceRoots: string[];

  @ApiProperty({ type: [String], example: ['file', 'git', 'terminal'] })
  @IsArray()
  @IsString({ each: true })
  availableProviders: string[];

  @ApiProperty({ type: [String], example: ['codex', 'claude-code'] })
  @IsArray()
  @IsString({ each: true })
  cliProviders: string[];

  @ApiProperty({ required: false, type: Object })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
