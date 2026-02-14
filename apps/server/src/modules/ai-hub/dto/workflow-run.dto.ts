import { IsString, IsOptional, IsObject } from 'class-validator';

export class RunWorkflowDto {
  @IsOptional()
  @IsString()
  projectId?: string;

  @IsOptional()
  @IsString()
  taskId?: string;

  @IsOptional()
  @IsObject()
  parameters?: Record<string, any>;

  @IsOptional()
  @IsString()
  triggerType?: string;
}
