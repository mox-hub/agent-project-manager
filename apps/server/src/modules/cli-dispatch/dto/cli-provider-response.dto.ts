/**
 * CLI Provider 探测与执行状态响应 DTO
 */
import { ApiProperty } from '@nestjs/swagger';

export class CliProviderSummaryDto {
  @ApiProperty({ type: String })
  providerId: string;

  @ApiProperty({ type: Boolean })
  available: boolean;

  @ApiProperty({ type: String, nullable: true })
  version: string | null;

  @ApiProperty({ type: String, nullable: true })
  error: string | null;
}

export class CliProvidersResponseDto {
  @ApiProperty({ type: [CliProviderSummaryDto] })
  providers: CliProviderSummaryDto[];

  @ApiProperty({ type: String, nullable: true })
  defaultProvider: string | null;
}

export class DetectedCliProviderDto {
  @ApiProperty({ type: String })
  providerId: string;

  @ApiProperty({ type: Boolean })
  available: boolean;

  @ApiProperty({ type: String, nullable: true })
  version: string | null;

  @ApiProperty({ type: String, nullable: true })
  error: string | null;

  @ApiProperty({ type: String, format: 'date-time' })
  detectedAt: string;
}

export class DetectedCliProvidersResponseDto {
  @ApiProperty({ type: [DetectedCliProviderDto] })
  providers: DetectedCliProviderDto[];
}

export class ExecutionStatusResponseDto {
  @ApiProperty({ type: String })
  executionRunId: string;

  @ApiProperty({ type: String })
  status: string;

  @ApiProperty({ type: Boolean })
  isRunning: boolean;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  startedAt: string | null;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  completedAt: string | null;
}
