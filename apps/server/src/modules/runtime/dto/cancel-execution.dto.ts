import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class CancelExecutionDto {
  @ApiPropertyOptional({ example: 'manual_cancelled_by_operator' })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional({ example: 'user_001' })
  @IsOptional()
  @IsString()
  cancelledBy?: string;
}
