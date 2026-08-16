import { IsString, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AddDocumentAuthorDto {
  @ApiProperty()
  @IsString()
  documentId: string;

  @ApiProperty()
  @IsString()
  memberId: string;

  @ApiProperty({
    enum: ['author', 'co_author', 'reviewer'],
    required: false,
  })
  @IsEnum(['author', 'co_author', 'reviewer'])
  @IsOptional()
  role?: string;
}

export class AddDocumentReviewerDto {
  @ApiProperty()
  @IsString()
  documentId: string;

  @ApiProperty()
  @IsString()
  memberId: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  comment?: string;
}

export class UpdateDocumentReviewerDto {
  @ApiProperty({ enum: ['pending', 'approved', 'rejected', 'skipped'] })
  @IsEnum(['pending', 'approved', 'rejected', 'skipped'])
  status: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  comment?: string;
}

export class AddDocTaskLinkAssigneeDto {
  @ApiProperty()
  @IsString()
  documentTaskLinkId: string;

  @ApiProperty()
  @IsString()
  memberId: string;

  @ApiProperty({ enum: ['owner', 'contributor'], required: false })
  @IsEnum(['owner', 'contributor'])
  @IsOptional()
  role?: string;
}
