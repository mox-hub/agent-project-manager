import { IsString, IsOptional, IsArray, IsEnum } from 'class-validator';
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

export class BulkSetTaskAssigneesDto {
  @ApiProperty()
  @IsString()
  taskId: string;

  @ApiProperty({ type: [Object], description: 'Array of {memberId, role}' })
  assignees: Array<{ memberId: string; role?: string }>;
}

export class AddTaskWatcherDto {
  @ApiProperty()
  @IsString()
  taskId: string;

  @ApiProperty()
  @IsString()
  memberId: string;
}
