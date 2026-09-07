/**
 * Integration 配置 / 外链 / 同步日志 / Linear 探测响应 DTO
 */
import { ApiProperty } from '@nestjs/swagger';

export class IntegrationConfigResponseDto {
  @ApiProperty({ type: String })
  id: string;

  @ApiProperty({ type: String })
  provider: string;

  @ApiProperty({ type: String })
  scope: string;

  @ApiProperty({ type: String, nullable: true })
  projectId: string | null;

  @ApiProperty({ type: String })
  name: string;

  @ApiProperty({ type: Boolean })
  enabled: boolean;

  @ApiProperty({ type: String, nullable: true })
  status: string | null;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  lastSyncAt: string | null;

  @ApiProperty({ type: String, nullable: true })
  errorMessage: string | null;

  @ApiProperty({ type: Object, additionalProperties: true, nullable: true })
  metadata: Record<string, unknown> | null;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt: string;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt: string;

  @ApiProperty({ type: String, nullable: true })
  createdBy: string | null;
}

export class ExternalIssueLinkResponseDto {
  @ApiProperty({ type: String })
  id: string;

  @ApiProperty({ type: String })
  projectId: string;

  @ApiProperty({ type: String, nullable: true })
  issueId: string | null;

  @ApiProperty({ type: String })
  provider: string;

  @ApiProperty({ type: String })
  externalId: string;

  @ApiProperty({ type: String })
  url: string;

  @ApiProperty({ type: String, nullable: true })
  summary: string | null;

  @ApiProperty({ type: String, nullable: true })
  status: string | null;

  @ApiProperty({ type: Object, additionalProperties: true, nullable: true })
  metadata: Record<string, unknown> | null;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt: string;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt: string;
}

export class IntegrationSyncLogResponseDto {
  @ApiProperty({ type: String })
  id: string;

  @ApiProperty({ type: String })
  integrationId: string;

  @ApiProperty({ type: String, nullable: true })
  projectId: string | null;

  @ApiProperty({ type: String })
  resourceType: string;

  @ApiProperty({ type: String, nullable: true })
  resourceId: string | null;

  @ApiProperty({ type: String })
  action: string;

  @ApiProperty({ type: String, nullable: true })
  direction: string | null;

  @ApiProperty({ type: String })
  status: string;

  @ApiProperty({ type: String, nullable: true })
  message: string | null;

  @ApiProperty({ type: Object, additionalProperties: true, nullable: true })
  payload: Record<string, unknown> | null;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt: string;
}

export class LinearViewerOrgDto {
  @ApiProperty({ type: String })
  id: string;

  @ApiProperty({ type: String })
  name: string;

  @ApiProperty({ type: String, nullable: true })
  urlKey: string | null;
}

export class LinearViewerDto {
  @ApiProperty({ type: String })
  id: string;

  @ApiProperty({ type: String })
  name: string;

  @ApiProperty({ type: String })
  email: string;

  @ApiProperty({ type: [LinearViewerOrgDto] })
  organizations: LinearViewerOrgDto[];

  @ApiProperty({
    type: [Object],
    additionalProperties: true,
    description: 'Linear 团队节点（透传远端 SDK 形状）',
  })
  teams: Record<string, unknown>[];
}

export class LinearConnectionTestResponseDto {
  @ApiProperty({ type: Boolean })
  ok: boolean;

  @ApiProperty({ type: LinearViewerDto })
  viewer: LinearViewerDto;
}

export class LinearRemoteProjectDto {
  @ApiProperty({ type: String })
  id: string;

  @ApiProperty({ type: String })
  name: string;

  @ApiProperty({ type: String, nullable: true })
  icon: string | null;

  @ApiProperty({ type: String, nullable: true })
  color: string | null;

  @ApiProperty({ type: String, nullable: true })
  description: string | null;

  @ApiProperty({ type: String, nullable: true })
  url: string | null;

  @ApiProperty({ type: String, nullable: true })
  state: string | null;

  @ApiProperty({ type: Number, nullable: true })
  priority: number | null;

  @ApiProperty({
    type: [Object],
    additionalProperties: true,
    description: 'Linear 团队节点（透传远端 SDK 形状）',
  })
  teams: Record<string, unknown>[];

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt: string;
}
