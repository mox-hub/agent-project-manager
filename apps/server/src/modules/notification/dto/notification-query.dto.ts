import { IsOptional, IsString, IsEnum } from 'class-validator';

export enum NotificationStatus {
  UNREAD = 'unread',
  READ = 'read',
}

export class NotificationQueryDto {
  @IsOptional()
  @IsEnum(NotificationStatus)
  status?: NotificationStatus;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsString()
  projectId?: string;

  @IsOptional()
  @IsString()
  from?: string; // ISO timestamp

  @IsOptional()
  @IsString()
  to?: string; // ISO timestamp

  @IsOptional()
  @IsString()
  page?: string;

  @IsOptional()
  @IsString()
  pageSize?: string;
}
