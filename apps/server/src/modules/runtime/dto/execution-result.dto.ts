import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsObject, IsOptional, IsString, ValidateNested } from 'class-validator';
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

  @ApiProperty({ required: false, type: Object, nullable: true })
  @IsOptional()
  @IsObject()
  error?: Record<string, unknown> | null;
}