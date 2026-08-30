import {
  IsString,
  IsOptional,
  IsArray,
  IsEnum,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTaskAssigneeDto {
  @ApiProperty()
  @IsString()
  taskId: string;

  @ApiProperty()
  @IsString()
  memberId: string;

  @ApiProperty({
    enum: ['assignee', 'co_assignee', 'reviewer', 'watcher'],
    required: false,
  })
  @IsEnum(['assignee', 'co_assignee', 'reviewer', 'watcher'])
  @IsOptional()
  role?: string;
}

export class BulkTaskAssigneeItemDto {
  @ApiProperty()
  @IsString()
  memberId: string;

  @ApiProperty({
    enum: ['assignee', 'co_assignee', 'reviewer', 'watcher'],
    required: false,
  })
  @IsEnum(['assignee', 'co_assignee', 'reviewer', 'watcher'])
  @IsOptional()
  role?: string;
}

export class BulkSetTaskAssigneesDto {
  @ApiProperty()
  @IsString()
  taskId: string;

  @ApiProperty({
    type: [BulkTaskAssigneeItemDto],
    description: 'Array of {memberId, role}',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkTaskAssigneeItemDto)
  assignees: BulkTaskAssigneeItemDto[];
}

export class AddTaskWatcherDto {
  @ApiProperty()
  @IsString()
  taskId: string;

  @ApiProperty()
  @IsString()
  memberId: string;
}
