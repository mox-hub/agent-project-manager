import { IsString, IsOptional, IsArray, IsObject, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

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

  @ApiProperty({
    description: 'Quiet hours configuration',
    example: { start: '22:00', end: '08:00', timezone: 'UTC' },
    required: false,
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
