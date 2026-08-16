import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsObject, IsOptional, IsString } from 'class-validator';

export class ConfirmTaskExecutionDto {
  @ApiProperty({
    description: 'Decision for the pending approval request',
    enum: ['approved', 'rejected'],
    example: 'approved',
  })
  @IsIn(['approved', 'rejected'])
  decision: 'approved' | 'rejected';

  @ApiProperty({
    description: 'Optional comment for the approval decision',
    example: '计划可执行，但保留人工 review',
    required: false,
  })
  @IsString()
  @IsOptional()
  comment?: string;

  @ApiProperty({
    description: 'Additional decision payload',
    example: { reviewer: 'owner' },
    required: false,
  })
  @IsObject()
  @IsOptional()
  decisionPayload?: Record<string, unknown>;
}
