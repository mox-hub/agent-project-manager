import { IsString, IsOptional, IsArray, IsObject, IsBoolean } from 'class-validator';

export class NotificationPreferenceItemDto {
  @IsOptional()
  @IsString()
  projectId?: string;

  @IsString()
  eventType: string; // 'task.*' | 'ci.*' | 'task.assigned' | etc.

  @IsArray()
  @IsString({ each: true })
  channels: string[]; // ['in-app'] | ['in-app', 'email'] | etc.

  @IsOptional()
  @IsString()
  digestFrequency?: string; // 'none' | 'daily' | 'weekly'

  @IsOptional()
  @IsObject()
  quietHours?: {
    start: string;
    end: string;
    timezone: string;
  };

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}

export class UpdateNotificationPreferencesDto {
  @IsArray()
  preferences: NotificationPreferenceItemDto[];
}
