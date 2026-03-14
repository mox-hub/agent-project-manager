import { IsString, IsOptional, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class TaskQueryDto {
  @ApiProperty({
    description:
      'JSON string for filters, e.g. {"status":["todo"],"assigneeId":["user-1"],"iterationId":["iter-1"],"tag":["tag-1"]}',
    example: '{"status":["todo"],"assigneeId":["user-1"]}',
    required: false,
  })
  @IsString()
  @IsOptional()
  filters?: string;

  @ApiProperty({
    description: 'Search query',
    example: 'authentication',
    required: false,
  })
  @IsString()
  @IsOptional()
  q?: string;

  @ApiProperty({
    description: 'Page number',
    example: 1,
    default: 1,
    required: false,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiProperty({
    description: 'Page size',
    example: 20,
    default: 20,
    required: false,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  pageSize?: number = 20;
}
