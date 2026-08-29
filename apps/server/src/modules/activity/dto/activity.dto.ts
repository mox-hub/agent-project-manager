import {
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class QueryActivityDto {
  @ApiProperty({ description: 'Entity type', enum: ['task', 'bug', 'project'] })
  @IsIn(['task', 'bug', 'project'])
  @IsOptional()
  entityType?: 'task' | 'bug' | 'project';

  @ApiProperty({ description: 'Entity ID (task/bug/project id)' })
  @IsString()
  entityId: string;
}

export class CreateActivityCommentDto {
  @ApiProperty({ description: 'Entity type', enum: ['task', 'bug', 'project'] })
  @IsIn(['task', 'bug', 'project'])
  entityType: 'task' | 'bug' | 'project';

  @ApiProperty({ description: 'Entity ID' })
  @IsString()
  entityId: string;

  @ApiProperty({ description: 'Comment content (markdown)' })
  @IsString()
  @MinLength(1)
  @MaxLength(20000)
  content: string;
}

export class UpdateActivityCommentDto {
  @ApiProperty({ description: 'Comment content (markdown)' })
  @IsString()
  @MinLength(1)
  @MaxLength(20000)
  content: string;
}

export class ToggleActivityReactionDto {
  @ApiProperty({ description: 'Emoji character' })
  @IsString()
  @MinLength(1)
  @MaxLength(32)
  emoji: string;
}
