import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString } from 'class-validator';

export class RuntimeHeartbeatDto {
  @ApiProperty({ example: 'rs_001' })
  @IsString()
  runtimeSessionId: string;

  @ApiProperty({ example: 'online' })
  @IsString()
  status: string;

  @ApiProperty({ required: false, type: [String], example: ['exec_001'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  activeExecutionIds?: string[];
}
