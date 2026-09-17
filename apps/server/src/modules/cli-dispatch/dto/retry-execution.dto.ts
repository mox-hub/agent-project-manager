import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * 重新执行可选载荷（批一 P0 切片 3，2026-09-17 裁决 D）：
 * 「按诊断重试」时前端把失败诊断结论（recommendation 摘要）随血缘带入
 * 新执行的 retryContext，供下次派发上下文参考；纯「重新执行」不传即无感。
 */
export class RetryExecutionDto {
  @ApiPropertyOptional({
    description: '失败诊断结论摘要（failure-diagnosis 场景的 recommendation）',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  diagnosis?: string;
}
