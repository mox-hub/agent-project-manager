import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class ResolveApprovalDto {
  @ApiPropertyOptional({ example: 'approved' })
  @IsOptional()
  @IsString()
  resolution?: 'approved' | 'rejected';

  @ApiPropertyOptional({ example: '允许继续写回' })
  @IsOptional()
  @IsString()
  resolutionNote?: string;
}
