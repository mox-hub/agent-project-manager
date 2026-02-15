import { IsString, IsOptional } from 'class-validator';

export class CreateTerminalSessionDto {
  @IsString()
  @IsOptional()
  projectId?: string;

  @IsString()
  @IsOptional()
  repoId?: string;

  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  shell?: string;

  @IsString()
  @IsOptional()
  cwd?: string;
}
