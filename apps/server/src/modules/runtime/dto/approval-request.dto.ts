import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class ApprovalRequestDto {
  @ApiProperty({ example: 'task.write_result' })
  @IsString()
  requestedAction: string;

  @ApiProperty({ example: 'medium' })
  @IsString()
  riskLevel: string;

  @ApiProperty({ example: '准备写回执行结果' })
  @IsString()
  reason: string;

  @ApiProperty({ required: false, example: 'step_002' })
  @IsOptional()
  @IsString()
  stepId?: string;
}