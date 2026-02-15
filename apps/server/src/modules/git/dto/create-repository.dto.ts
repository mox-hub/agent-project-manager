import { IsString, IsOptional, IsNotEmpty } from 'class-validator';

export class CreateRepositoryDto {
  @IsString()
  @IsNotEmpty()
  projectId: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  localPath?: string;

  @IsString()
  @IsOptional()
  remoteUrl?: string;

  @IsString()
  @IsOptional()
  role?: string;

  @IsString()
  @IsOptional()
  defaultBranch?: string;

  @IsString()
  @IsOptional()
  provider?: string;
}
