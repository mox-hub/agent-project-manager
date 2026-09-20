/**
 * 项目模块代码响应 DTO
 */
import { ApiProperty } from '@nestjs/swagger';

export class ProjectModuleResponseDto {
  @ApiProperty({ type: String })
  id: string;

  @ApiProperty({ type: String })
  projectId: string;

  @ApiProperty({ type: String, description: '2-4 位大写模块代码' })
  code: string;

  @ApiProperty({ type: String })
  name: string;

  @ApiProperty({ type: String, nullable: true })
  description: string | null;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt: string;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt: string;
}
