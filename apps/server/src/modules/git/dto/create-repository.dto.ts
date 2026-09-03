import { IsString, IsOptional, IsNotEmpty } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateRepositoryDto {
  @ApiProperty({ description: '所属项目 ID' })
  @IsString()
  @IsNotEmpty()
  projectId: string;

  @ApiProperty({ description: '仓库名称' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ description: '本地路径' })
  @IsString()
  @IsOptional()
  localPath?: string;

  @ApiPropertyOptional({ description: '远程仓库地址' })
  @IsString()
  @IsOptional()
  remoteUrl?: string;

  @ApiPropertyOptional({ description: '仓库角色' })
  @IsString()
  @IsOptional()
  role?: string;

  @ApiPropertyOptional({ description: '默认分支' })
  @IsString()
  @IsOptional()
  defaultBranch?: string;

  @ApiPropertyOptional({ description: '托管平台（github/gitlab 等）' })
  @IsString()
  @IsOptional()
  provider?: string;
}
