/**
 * Runtime 派发/上下文响应 DTO（供 @ApiOkResponse 声明契约形状）
 */
import { ApiProperty } from '@nestjs/swagger';

export class RuntimeDispatchResponseDto {
  @ApiProperty({ type: String })
  executionRunId: string;

  @ApiProperty({ type: String, nullable: true })
  projectId: string | null;

  @ApiProperty({ type: String, nullable: true })
  issueId: string | null;

  @ApiProperty({ type: String })
  subjectType: string;

  @ApiProperty({ type: String })
  subjectId: string;

  @ApiProperty({ type: String, nullable: true })
  contextPackRef: string | null;

  @ApiProperty({ type: [String] })
  requestedActions: string[];

  @ApiProperty({ type: [String] })
  toolScopes: string[];

  @ApiProperty({ type: String })
  approvalState: string;

  @ApiProperty({ type: Object, additionalProperties: true })
  policySnapshot: Record<string, unknown>;

  @ApiProperty({ type: String, nullable: true })
  prompt: string | null;

  @ApiProperty({ type: String, nullable: true })
  workspaceRoot: string | null;

  @ApiProperty({ type: String, nullable: true })
  providerId: string | null;

  @ApiProperty({ type: String, nullable: true })
  model: string | null;

  @ApiProperty({ type: [String], nullable: true })
  allowedTools: string[] | null;

  @ApiProperty({ type: Number, nullable: true })
  timeout: number | null;
}
