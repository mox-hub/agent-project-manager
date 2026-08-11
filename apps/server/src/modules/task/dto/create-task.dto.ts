import {
  IsString,
  IsOptional,
  IsEnum,
  IsDateString,
  IsInt,
  IsArray,
  ValidateNested,
  Matches,
  IsIn,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class TodoItemDto {
  @ApiProperty({ description: '待办事项 ID' })
  @IsString()
  id: string;

  @ApiProperty({ description: '待办事项内容' })
  @IsString()
  content: string;

  @ApiProperty({ description: '是否已完成' })
  @IsOptional()
  completed?: boolean;

  @ApiProperty({ description: '排序顺序' })
  @IsInt()
  @IsOptional()
  order?: number;
}

export class CreateTaskDto {
  @ApiProperty({
    description: 'Project ID (optional, can be bound later)',
    example: 'project-123',
    required: false,
  })
  @IsString()
  @IsOptional()
  projectId?: string;

  @ApiProperty({
    description: 'Task title',
    example: 'Implement user authentication',
  })
  @IsString()
  title: string;

  @ApiProperty({
    description: 'Task description',
    example: 'Implement JWT-based authentication system',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'Task status',
    example: 'todo',
    required: false,
  })
  @IsString()
  @IsOptional()
  status?: string;

  @ApiProperty({
    description: 'Task priority',
    enum: ['low', 'medium', 'high', 'critical'],
    example: 'high',
    required: false,
  })
  @IsEnum(['low', 'medium', 'high', 'critical'])
  @IsOptional()
  priority?: string;

  @ApiProperty({
    description: 'Assignee user ID',
    example: 'user-123',
    required: false,
  })
  @IsString()
  @IsOptional()
  assigneeId?: string;

  @ApiProperty({
    description: "Assignee type",
    enum: ['user', 'ai_agent'],
    example: 'ai_agent',
    required: false,
  })
  @IsIn(['user', 'ai_agent'])
  @IsOptional()
  assigneeType?: string;

  @ApiProperty({
    description: 'Assigned AI agent ID',
    example: 'agent-123',
    required: false,
  })
  @IsString()
  @IsOptional()
  aiAgentId?: string;

  @ApiProperty({
    description: 'Reporter user ID',
    example: 'user-456',
    required: false,
  })
  @IsString()
  @IsOptional()
  reporterId?: string;

  @ApiProperty({
    description: 'Iteration ID',
    example: 'iteration-123',
    required: false,
  })
  @IsString()
  @IsOptional()
  iterationId?: string;

  @ApiProperty({
    description: 'Parent task ID',
    example: 'task-123',
    required: false,
  })
  @IsString()
  @IsOptional()
  parentTaskId?: string;

  @ApiProperty({
    description: 'Start date (ISO 8601)',
    example: '2024-12-01T00:00:00Z',
    required: false,
  })
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiProperty({
    description: 'Due date (ISO 8601)',
    example: '2024-12-31T23:59:59Z',
    required: false,
  })
  @IsDateString()
  @IsOptional()
  dueDate?: string;

  @ApiProperty({
    description: 'Estimated hours',
    example: 8,
    required: false,
  })
  @IsInt()
  @IsOptional()
  estimate?: number;

  @ApiProperty({
    description: 'Task tags',
    example: ['frontend', 'urgent'],
    type: [String],
    required: false,
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  // Bug 专用字段
  @ApiProperty({
    description: 'Bug severity (for bug type)',
    enum: ['critical', 'high', 'medium', 'low'],
    example: 'high',
    required: false,
  })
  @IsEnum(['critical', 'high', 'medium', 'low'])
  @IsOptional()
  severity?: string;

  @ApiProperty({
    description: 'Bug reproducibility',
    example: 'always',
    required: false,
  })
  @IsString()
  @IsOptional()
  bugReproducibility?: string;

  @ApiProperty({
    description: 'Bug steps to reproduce',
    example: '1. Go to login page\n2. Enter wrong credentials\n3. Click login',
    required: false,
  })
  @IsString()
  @IsOptional()
  bugStepsToReproduce?: string;

  @ApiProperty({
    description: 'Bug environment',
    example: 'Chrome 120, Windows 11',
    required: false,
  })
  @IsString()
  @IsOptional()
  bugEnvironment?: string;

  @ApiProperty({
    description: 'Bug expected result',
    example: 'Should show error message',
    required: false,
  })
  @IsString()
  @IsOptional()
  bugExpectedResult?: string;

  @ApiProperty({
    description: 'Bug actual result',
    example: 'Page crashes',
    required: false,
  })
  @IsString()
  @IsOptional()
  bugActualResult?: string;

  // AI Agent Assignment
  @ApiProperty({
    description: 'AI execution specification',
    example: {
      expectedOutput: '更新任务实现方案并附带证据链接',
      tools: ['task.read', 'task.write'],
      confirmationRequired: true,
    },
    required: false,
  })
  @IsObject()
  @IsOptional()
  aiExecutionSpec?: Record<string, unknown>;

  // Task/Bug 类型区分
  @ApiProperty({
    description: 'Task type: task or bug',
    enum: ['task', 'bug'],
    example: 'task',
    required: false,
    default: 'task',
  })
  @IsEnum(['task', 'bug'])
  @IsOptional()
  type?: string;

  // 模块代码 (Phase 4): 用于生成短 ID, 例如 'PF' / 'UI' / 'BE'
  // 当 projectId 缺失时, 此字段可省略, 服务端会自动 fallback 到 inbox 模块
  @ApiProperty({
    description: '项目内模块代码, 2-4 位大写字母, 例如 PF / UI / BE',
    example: 'PF',
    required: false,
  })
  @IsString()
  @Matches(/^[A-Z]{2,4}$/)
  @IsOptional()
  moduleCode?: string;

  // 里程碑关联
  @ApiProperty({
    description: 'Milestone ID',
    example: 'milestone-123',
    required: false,
  })
  @IsString()
  @IsOptional()
  milestoneId?: string;

  // 待办事项
  @ApiProperty({
    description: 'Todo items (for task checklist)',
    type: [TodoItemDto],
    required: false,
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TodoItemDto)
  @IsOptional()
  todoItems?: TodoItemDto[];
}
