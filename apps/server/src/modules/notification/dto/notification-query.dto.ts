import { IsOptional, IsString, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum NotificationStatus {
  UNREAD = 'unread',
  READ = 'read',
}

export class NotificationQueryDto {
  @ApiProperty({
    description: 'Notification status filter',
    enum: NotificationStatus,
    example: NotificationStatus.UNREAD,
    required: false,
  })
  @IsOptional()
  @IsEnum(NotificationStatus)
  status?: NotificationStatus;

  @ApiProperty({
    description: 'Notification type filter',
    example: 'task.assigned',
    required: false,
  })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiProperty({
    description: 'Filter by project ID',
    example: 'project-123',
    required: false,
  })
  @IsOptional()
  @IsString()
  projectId?: string;

  @ApiProperty({
    description: 'Start date filter (ISO timestamp)',
    example: '2024-01-01T00:00:00Z',
    required: false,
  })
  @IsOptional()
  @IsString()
  from?: string; // ISO timestamp

  @ApiProperty({
    description: 'End date filter (ISO timestamp)',
    example: '2024-12-31T23:59:59Z',
    required: false,
  })
  @IsOptional()
  @IsString()
  to?: string; // ISO timestamp

  @ApiProperty({
    description: 'Page number',
    example: '1',
    required: false,
  })
  @IsOptional()
  @IsString()
  page?: string;

  @ApiProperty({
    description: 'Page size',
    example: '20',
    required: false,
  })
  @IsOptional()
  @IsString()
  pageSize?: string;
}
