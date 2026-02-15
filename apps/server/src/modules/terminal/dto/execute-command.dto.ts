import { IsString, IsNotEmpty, IsOptional, IsObject } from 'class-validator';

export class ExecuteCommandDto {
  @IsString()
  @IsNotEmpty()
  command: string;

  @IsString({ each: true })
  @IsOptional()
  args?: string[];

  @IsObject()
  @IsOptional()
  env?: Record<string, string>;
}
