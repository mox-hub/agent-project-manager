/**
 * 本地基础环境检测服务。
 *
 * 聚合六项探测：node/git（用户态 PATH spawn `--version`，模式与 cli adapter detect
 * 一致：shell:true + 5s 超时）+ 四个 AI CLI（复用 CliProviderService.detectAll——
 * DB commandPath 覆盖参与判定，用户配过自定义路径不会被误报未安装）。
 * 探测纯只读系统事实，不落库、不代装；AI CLI 探测链故障时诚实降级（error 注记），
 * 不阻塞 node/git 结果。
 */

import { Injectable, Logger } from '@nestjs/common';
import { spawn } from 'child_process';
import { CliProviderService } from '@/modules/cli-provider/cli-provider.service';
import {
  ENVIRONMENT_TOOL_KEYS,
  EnvironmentToolDto,
  EnvironmentToolKey,
  EnvironmentReportDto,
} from './dto/environment.dto';

/** 探测超时（与 cli-dispatch adapters 的 detect 同尺） */
const DETECT_TIMEOUT_MS = 5000;

@Injectable()
export class EnvironmentService {
  private readonly logger = new Logger(EnvironmentService.name);

  constructor(private readonly cliProviderService: CliProviderService) {}

  async check(): Promise<EnvironmentReportDto> {
    const [systemTools, aiTools] = await Promise.all([
      Promise.all([
        this.detectSystemCommand('node'),
        this.detectSystemCommand('git'),
      ]),
      this.detectAiProviders(),
    ]);

    return {
      tools: [...systemTools, ...aiTools],
      checkedAt: new Date().toISOString(),
    };
  }

  /** 系统命令探测：spawn `<cmd> --version`，退出码 0 且有 stdout 即已安装 */
  private detectSystemCommand(
    key: 'node' | 'git',
  ): Promise<EnvironmentToolDto> {
    return new Promise((resolve) => {
      let settled = false;
      const settle = (result: EnvironmentToolDto) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(result);
      };

      const proc = spawn(key, ['--version'], { shell: true });
      let version = '';
      let errorOutput = '';

      const timer = setTimeout(() => {
        proc.kill();
        settle({
          key,
          installed: false,
          version: null,
          error: 'Detection timeout',
        });
      }, DETECT_TIMEOUT_MS);

      proc.stdout?.on('data', (data: Buffer) => {
        version += data.toString();
      });
      proc.stderr?.on('data', (data: Buffer) => {
        errorOutput += data.toString();
      });
      proc.on('close', (code: number) => {
        if (code === 0 && version.trim()) {
          settle({
            key,
            installed: true,
            version: version.trim(),
            error: null,
          });
        } else {
          settle({
            key,
            installed: false,
            version: null,
            error:
              errorOutput.trim() || 'Command not found or failed to execute',
          });
        }
      });
      proc.on('error', (err: Error) => {
        settle({ key, installed: false, version: null, error: err.message });
      });
    });
  }

  /**
   * AI CLI 探测：走 cli-provider 全量探测（含 DB 覆盖刷新与快照留痕）。
   * 每项独立 try/catch 不够——detectAll 内部是整批 Promise.all，故整批降级。
   */
  private async detectAiProviders(): Promise<EnvironmentToolDto[]> {
    try {
      const providers = await this.cliProviderService.detectAll();
      return providers.map((p) => ({
        key: p.providerId as EnvironmentToolKey,
        installed: p.available,
        version: p.version ?? null,
        error: p.error ?? null,
      }));
    } catch (err) {
      this.logger.warn(
        `CLI provider detect failed, degrade to unknown: ${String(err)}`,
      );
      return ENVIRONMENT_TOOL_KEYS.filter(
        (k) => k !== 'node' && k !== 'git',
      ).map((key) => ({
        key,
        installed: false,
        version: null,
        error: 'Detection unavailable',
      }));
    }
  }
}
