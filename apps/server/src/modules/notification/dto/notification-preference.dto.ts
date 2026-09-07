import {
  IsString,
  IsOptional,
  IsArray,
  IsObject,
  IsBoolean,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/** 免打扰时段（fixed shape，供契约精确描述） */
export class QuietHoursDto {
  @ApiProperty({ description: '开始时间 HH:mm', example: '22:00' })
  start!: string;

  @ApiProperty({ description: '结束时间 HH:mm', example: '08:00' })
  end!: string;

  @ApiProperty({ description: 'IANA 时区', example: 'UTC' })
  timezone!: string;
}

export class NotificationPreferenceItemDto {
  @ApiProperty({
    description: 'Project ID (optional, for project-specific preferences)',
    example: 'project-123',
    required: false,
  })
  @IsOptional()
  @IsString()
  projectId?: string;

  @ApiProperty({
    description: 'Event type pattern',
    example: 'task.assigned',
  })
  @IsString()
  eventType: string; // 'task.*' | 'ci.*' | 'task.assigned' | etc.

  @ApiProperty({
    description: 'Notification channels',
    example: ['in-app', 'email'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  channels: string[]; // ['in-app'] | ['in-app', 'email'] | etc.

  @ApiProperty({
    description: 'Digest frequency',
    enum: ['none', 'daily', 'weekly'],
    example: 'daily',
    required: false,
  })
  @IsOptional()
  @IsString()
  digestFrequency?: string; // 'none' | 'daily' | 'weekly'

  @ApiPropertyOptional({
    description: 'Quiet hours configuration',
    example: { start: '22:00', end: '08:00', timezone: 'UTC' },
    type: QuietHoursDto,
  })
  @IsOptional()
  @IsObject()
  quietHours?: {
    start: string;
    end: string;
    timezone: string;
  };

  @ApiProperty({
    description: 'Whether this preference is enabled',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}

export class UpdateNotificationPreferencesDto {
  @ApiProperty({
    description: 'Array of notification preferences',
    type: [NotificationPreferenceItemDto],
  })
  @IsArray()
  preferences: NotificationPreferenceItemDto[];
}
