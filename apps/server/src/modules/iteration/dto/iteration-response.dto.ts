// Iteration 响应 DTO（口径：JSON 序列化后的 Prisma Iteration 裸数据）
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class IterationIssueCountDto {
  @ApiProperty({ description: '迭代内任务数' })
  issues: number;
}

export class IterationResponseDto {
  @ApiProperty({ description: '迭代 ID' })
  id: string;

  @ApiProperty({ description: '所属项目 ID' })
  projectId: string;

  @ApiProperty({ description: '迭代名称' })
  name: string;

  @ApiProperty({ description: '迭代目标', nullable: true, type: String })
  goal: string | null;

  @ApiProperty({ description: '开始日期（ISO 8601）' })
  startDate: string;

  @ApiProperty({ description: '结束日期（ISO 8601）' })
  endDate: string;

  @ApiProperty({ description: '容量（故事点）', nullable: true, type: Number })
  capacity: number | null;

  @ApiProperty({
    description: '迭代状态',
    enum: ['planned', 'active', 'completed', 'cancelled'],
  })
  status: string;

  @ApiProperty({ description: '创建时间（ISO 8601）' })
  createdAt: string;

  @ApiProperty({ description: '更新时间（ISO 8601）' })
  updatedAt: string;

  @ApiPropertyOptional({
    description: '任务计数（create/list 端点返回；update 端点无此字段）',
    type: IterationIssueCountDto,
  })
  _count?: IterationIssueCountDto;
}
