import {
  IsString,
  IsOptional,
  IsIn,
  IsArray,
  IsBoolean,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import type { SyncDirection } from '../providers/linear/linear.constants';

export const SYNC_DIRECTIONS: SyncDirection[] = [
  'pull',
  'push',
  'two-way',
  'force-pull',
  'force-push',
];

export class LinearSyncProjectDto {
  @ApiProperty({ description: 'Integration configuration ID' })
  @IsString()
  integrationId: string;

  @ApiProperty({ description: 'Linear project UUID' })
  @IsString()
  linearProjectId: string;

  @ApiProperty({
    description:
      'Target local project ID (optional). If omitted, a new local project is created.',
    required: false,
  })
  @IsOptional()
  @IsString()
  targetLocalProjectId?: string;
}

export class LinearSyncTasksDto {
  @ApiProperty({ description: 'Local project ID' })
  @IsString()
  projectId: string;

  @ApiProperty({
    description: 'Sync direction',
    enum: SYNC_DIRECTIONS,
    default: 'two-way',
  })
  @IsIn(SYNC_DIRECTIONS)
  direction: SyncDirection;

  @ApiProperty({
    description: 'Optional subset of task IDs to sync',
    required: false,
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  taskIds?: string[];

  @ApiProperty({ description: 'Confirm forced overwrite (for force-*)', required: false })
  @IsOptional()
  @IsBoolean()
  confirm?: boolean;
}

export class LinearCreateIssueDto {
  @ApiProperty({ description: 'Local project ID' })
  @IsString()
  projectId: string;

  @ApiProperty({ description: 'Local task ID to push' })
  @IsString()
  localTaskId: string;
}

export class LinearResolveConflictDto {
  @ApiProperty({
    description: 'How to resolve the conflict',
    enum: ['use_linear', 'use_local', 'keep_both'],
  })
  @IsIn(['use_linear', 'use_local', 'keep_both'])
  resolution: 'use_linear' | 'use_local' | 'keep_both';
}
