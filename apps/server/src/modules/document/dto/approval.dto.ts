import { IsString, IsOptional, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class SubmitApprovalDto {
  @ApiPropertyOptional({ description: 'Comment when submitting for review' })
  @IsString()
  @IsOptional()
  comment?: string;
}

export class ResolveApprovalDto {
  @ApiPropertyOptional({
    description: 'Approval decision',
    enum: ['approved', 'rejected'],
  })
  @IsEnum(['approved', 'rejected'])
  status: string;

  @ApiPropertyOptional({ description: 'Comment for the decision' })
  @IsString()
  @IsOptional()
  comment?: string;
}

export class ApprovalQueryDto {
  @ApiPropertyOptional({ description: 'Filter by status' })
  @IsEnum(['pending', 'approved', 'rejected'])
  @IsOptional()
  status?: string;

  @ApiPropertyOptional({ description: 'Filter by document ID' })
  @IsString()
  @IsOptional()
  documentId?: string;

  @ApiPropertyOptional({ description: 'Filter by submitter ID' })
  @IsString()
  @IsOptional()
  submitterId?: string;
}
