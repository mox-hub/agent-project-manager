import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class RuntimeProvidersDto {
  @ApiProperty({ required: false, default: true })
  @IsOptional()
  file?: boolean;

  @ApiProperty({ required: false, default: true })
  @IsOptional()
  git?: boolean;

  @ApiProperty({ required: false, default: true })
  @IsOptional()
  terminal?: boolean;

  @ApiProperty({ required: false, default: true })
  @IsOptional()
  process?: boolean;

  @ApiProperty({ required: false, default: true })
  @IsOptional()
  credentials?: boolean;

  [key: string]: unknown;
}

export class RuntimeCapabilitiesDto {
  @ApiProperty({
    type: [String],
    example: ['E:\\Project\\agent-project-manager'],
  })
  @IsArray()
  @IsString({ each: true })
  workspaceRoots: string[];

  @ApiProperty({ type: Object })
  @ValidateNested()
  @Type(() => RuntimeProvidersDto)
  providers: RuntimeProvidersDto;

  @ApiProperty({ type: [String], example: ['codex', 'claude-code'] })
  @IsArray()
  @IsString({ each: true })
  cliProviders: string[];

  @ApiProperty({ required: false, type: Object })
  @IsOptional()
  @IsObject()
  capabilityFlags?: Record<string, unknown>;

  @ApiProperty({ required: false, type: Object })
  @IsOptional()
  @IsObject()
  policyConstraints?: Record<string, unknown>;
}
