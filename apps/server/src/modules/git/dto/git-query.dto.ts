import { IsString, IsOptional, IsInt, Min, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';

export class RepositoryQueryDto {
  @IsString()
  @IsOptional()
  projectId?: string;

  @IsString()
  @IsOptional()
  provider?: string;
}

export class CommitQueryDto {
  @IsString()
  @IsOptional()
  from?: string;

  @IsString()
  @IsOptional()
  to?: string;

  @IsString()
  @IsOptional()
  author?: string;

  @IsString()
  @IsOptional()
  path?: string;

  @IsString()
  @IsOptional()
  q?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  pageSize?: number = 20;
}

export class DiffQueryDto {
  @IsString()
  @IsNotEmpty()
  repoId: string;

  @IsString()
  @IsNotEmpty()
  baseRef: string;

  @IsString()
  @IsNotEmpty()
  targetRef: string;

  @IsString({ each: true })
  @IsOptional()
  pathFilter?: string[];
}

export class PullRequestQueryDto {
  @IsString()
  @IsOptional()
  status?: string;

  @IsString()
  @IsOptional()
  author?: string;
}
