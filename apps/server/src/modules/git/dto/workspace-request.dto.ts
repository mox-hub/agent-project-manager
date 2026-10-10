import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

/**
 * 项目工作空间验证请求（validate）：带 localPath 时直验该路径（不读不写已存配置）。
 * 全局 ValidationPipe 是 whitelist+forbidNonWhitelisted——属性必须挂 class-validator
 * 装饰器才进白名单（只挂 Swagger 装饰器会被整条 400 拒绝，Git e2e 实证）。
 */
export class WorkspaceValidateRequestDto {
  @ApiPropertyOptional({
    type: String,
    description:
      '直接验证该路径（纯文件系统检查，不落库不改已存配置）；缺省时验证已保存的 localPath',
  })
  @IsOptional()
  @IsString()
  localPath?: string;
}

/** 项目工作空间目录确保请求（directory）：mkdir -p 幂等建目录后回检验结果 */
export class EnsureWorkspaceDirectoryRequestDto {
  @ApiProperty({
    type: String,
    description: '要创建（已存在则幂等跳过）的目录绝对路径',
  })
  @IsString()
  @IsNotEmpty()
  localPath!: string;
}
