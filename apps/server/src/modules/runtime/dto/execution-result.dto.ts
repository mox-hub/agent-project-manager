import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class RefItemDto {
  @ApiProperty({ example: 'plan' })
  @IsString()
  type: string;

  @ApiProperty({ example: 'artifact_001' })
  @IsString()
  ref: string;
}

export class ExecutionResultDto {
  @ApiProperty({ example: 'completed' })
  @IsString()
  status: string;

  @ApiProperty({ example: '任务执行完成' })
  @IsString()
  summary: string;

  @ApiProperty({ type: [RefItemDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RefItemDto)
  artifacts?: RefItemDto[];

  @ApiProperty({ type: [RefItemDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RefItemDto)
  evidence?: RefItemDto[];

  @ApiProperty({
    required: false,
    type: Object,
    additionalProperties: true,
    nullable: true,
  })
  @IsOptional()
  @IsObject()
  error?: Record<string, unknown> | null;

  @ApiProperty({
    required: false,
    type: Object,
    additionalProperties: true,
    nullable: true,
  })
  @IsOptional()
  @IsObject()
  usage?: CliUsageDto | null;

  @ApiProperty({
    required: false,
    type: Object,
    additionalProperties: true,
    nullable: true,
    description:
      'CLI 终态结构化输出（adapter parseFinalResult 产出，如 {response: 最终文本}）；缺省时服务端回落 {summary}',
  })
  @IsOptional()
  @IsObject()
  output?: Record<string, unknown> | null;
}

/** CLI 终事件 token 用量（守护进程上报；缺省表示未上报） */
export class CliUsageDto {
  @ApiProperty()
  @IsNumber()
  promptTokens: number;

  @ApiProperty()
  @IsNumber()
  completionTokens: number;

  @ApiProperty()
  @IsNumber()
  totalTokens: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  costUsd?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  model?: string;
}
