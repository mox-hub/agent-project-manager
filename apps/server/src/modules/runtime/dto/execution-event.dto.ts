import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString } from 'class-validator';

export class ExecutionEventDto {
  @ApiProperty({ example: 'execution.step.updated' })
  @IsString()
  eventType: string;

  @ApiProperty({ example: 'runtime-local-001' })
  @IsString()
  runtimeId: string;

  @ApiProperty({ required: false, example: 'step_001' })
  @IsOptional()
  @IsString()
  stepId?: string;

  @ApiProperty({ required: false, example: 'in_progress' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiProperty({ required: false, example: '已启动 Codex CLI 并进入任务执行阶段' })
  @IsOptional()
  @IsString()
  summary?: string;

  @ApiProperty({ required: false, type: [String], example: [] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  artifactRefs?: string[];

  @ApiProperty({ required: false, type: [String], example: [] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  evidenceRefs?: string[];

  @ApiProperty({ required: false, example: 'RUNTIME_PROVIDER_UNAVAILABLE' })
  @IsOptional()
  @IsString()
  errorCode?: string;

  @ApiProperty({ required: false, example: '2026-03-20T10:01:00Z' })
  @IsOptional()
  @IsString()
  timestamp?: string;
}