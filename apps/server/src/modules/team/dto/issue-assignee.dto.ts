import {
  IsString,
  IsOptional,
  IsArray,
  IsEnum,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class CreateIssueAssigneeDto {
  @ApiProperty()
  @IsString()
  issueId: string;

  @ApiProperty()
  @IsString()
  memberId: string;

  // 4d-3：AI 成员自动派发时绑定既有执行项（可选）
  @ApiProperty({ required: false, description: '绑定的执行项 Execution.id' })
  @IsOptional()
  @IsString()
  executionId?: string;

  @ApiProperty({
    enum: ['assignee', 'co_assignee', 'reviewer', 'watcher'],
    required: false,
  })
  @IsEnum(['assignee', 'co_assignee', 'reviewer', 'watcher'])
  @IsOptional()
  role?: string;
}

export class BulkIssueAssigneeItemDto {
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

export class BulkSetIssueAssigneesDto {
  @ApiProperty()
  @IsString()
  issueId: string;

  @ApiProperty({
    type: [BulkIssueAssigneeItemDto],
    description: 'Array of {memberId, role}',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkIssueAssigneeItemDto)
  assignees: BulkIssueAssigneeItemDto[];
}

export class AddIssueWatcherDto {
  @ApiProperty()
  @IsString()
  issueId: string;

  @ApiProperty()
  @IsString()
  memberId: string;
}
