import { IsString, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateMentionDto {
  @ApiProperty({ enum: ['task', 'document', 'comment', 'activity'] })
  @IsEnum(['task', 'document', 'comment', 'activity'])
  sourceType: string;

  @ApiProperty()
  @IsString()
  sourceId: string;

  @ApiProperty({ description: 'Member id being mentioned' })
  @IsString()
  memberId: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  context?: string;
}

export class ParseMentionsDto {
  @ApiProperty({ description: 'Text containing @handle references' })
  @IsString()
  text: string;

  @ApiProperty({ enum: ['task', 'document', 'comment', 'activity'] })
  @IsEnum(['task', 'document', 'comment', 'activity'])
  sourceType: string;

  @ApiProperty()
  @IsString()
  sourceId: string;
}
