/**
 * 提示词治理 DTO（CAP-A-24 + 增强 A/C/D）
 */
import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class SystemPromptMetaDto {
  @ApiProperty({ type: String, description: '稳定标识' })
  key: string;

  @ApiProperty({ type: String })
  title: string;

  @ApiProperty({ type: String, description: '用途说明' })
  description: string;

  @ApiProperty({ type: Number, description: '正文字符数' })
  charCount: number;
}

export class SystemPromptDetailDto extends SystemPromptMetaDto {
  @ApiProperty({ type: String, description: 'markdown 正文（只读）' })
  content: string;
}

export class SystemPromptListResponseDto {
  @ApiProperty({ type: [SystemPromptMetaDto] })
  items: SystemPromptMetaDto[];
}

export class PromptInjectionTogglesDto {
  @ApiProperty({ type: Boolean, description: '系统提示词段（内置规范）' })
  system: boolean;

  @ApiProperty({ type: Boolean, description: '项目级提示词段' })
  project: boolean;

  @ApiProperty({
    type: Boolean,
    description:
      '执行者段（角色 promptHint 继承 + 成员个人提示词 + 思考强度，合一段）',
  })
  executor: boolean;

  @ApiProperty({ type: Boolean, description: '团队规则段（teamPrompt）' })
  team: boolean;

  @ApiProperty({
    type: Boolean,
    description: '任务级自定义提示词段（metadata.taskPrompt）',
  })
  task: boolean;

  @ApiProperty({
    type: Boolean,
    description: '项目技能段（与 dispatch.skillsEnabled 项目开关叠加）',
  })
  skills: boolean;

  @ApiProperty({ type: Boolean, description: '上下文 JSON 段' })
  context: boolean;
}

export class PromptConfigResponseDto {
  @ApiProperty({ type: PromptInjectionTogglesDto })
  toggles: PromptInjectionTogglesDto;

  @ApiProperty({
    type: String,
    nullable: true,
    description: '项目级提示词全文（传 projectId 时返回；未配置为 null）',
  })
  projectPrompt: string | null;

  @ApiProperty({
    type: Object,
    nullable: true,
    description:
      'AGENTS.md 文件侧状态（传 projectId 时返回）：fileExists/blockContent/drifted',
  })
  agentsFile: {
    fileExists: boolean;
    blockContent: string | null;
    drifted: boolean;
  } | null;
}

export class UpdatePromptConfigDto {
  @ApiProperty({ type: Boolean, required: false })
  @IsOptional()
  @IsBoolean()
  system?: boolean;

  @ApiProperty({ type: Boolean, required: false })
  @IsOptional()
  @IsBoolean()
  project?: boolean;

  @ApiProperty({ type: Boolean, required: false })
  @IsOptional()
  @IsBoolean()
  executor?: boolean;

  @ApiProperty({ type: Boolean, required: false })
  @IsOptional()
  @IsBoolean()
  team?: boolean;

  @ApiProperty({ type: Boolean, required: false })
  @IsOptional()
  @IsBoolean()
  task?: boolean;

  @ApiProperty({ type: Boolean, required: false })
  @IsOptional()
  @IsBoolean()
  skills?: boolean;

  @ApiProperty({ type: Boolean, required: false })
  @IsOptional()
  @IsBoolean()
  context?: boolean;

  @ApiProperty({
    type: String,
    required: false,
    description: '项目级提示词编辑目标项目；与 projectPrompt 搭配使用',
  })
  @IsOptional()
  @IsString()
  projectId?: string;

  @ApiProperty({
    type: String,
    required: false,
    description:
      '项目级提示词全文；空串清空（删除配置）。保存后物化到 AGENTS.md 受管区块',
  })
  @IsOptional()
  @IsString()
  @MaxLength(20000)
  projectPrompt?: string;
}

export class PromptAgentsSyncResultDto {
  @ApiProperty({
    type: Boolean,
    description: 'AGENTS.md 是否成功写入（无工作区/IO 失败为 false）',
  })
  synced: boolean;

  @ApiProperty({
    type: String,
    nullable: true,
    description: '未同步原因（synced=false 时给人看）',
  })
  reason: string | null;
}

export class PromptConfigUpdateResponseDto {
  @ApiProperty({ type: PromptInjectionTogglesDto })
  toggles: PromptInjectionTogglesDto;

  @ApiProperty({
    type: String,
    nullable: true,
    description: '项目级提示词全文（传 projectId 时返回）',
  })
  projectPrompt: string | null;

  @ApiProperty({
    type: PromptAgentsSyncResultDto,
    nullable: true,
    description: 'AGENTS.md 物化结果（未涉及项目提示词保存时为 null）',
  })
  agentsSync: PromptAgentsSyncResultDto | null;
}

export class PromptPreviewSectionDto {
  @ApiProperty({
    type: String,
    description:
      '段落标识：system/executor/team/project/task/skills/taskBody/context/closing',
  })
  key: string;

  @ApiProperty({ type: Boolean, description: '该段是否实际注入' })
  injected: boolean;

  @ApiProperty({
    type: String,
    nullable: true,
    description: '段落内容（未注入为 null）',
  })
  content: string | null;
}

export class PromptPreviewResponseDto {
  @ApiProperty({ type: String })
  issueId: string;

  @ApiProperty({
    type: String,
    description: '组装后的完整派发 prompt（与实际派发同源）',
  })
  prompt: string;

  @ApiProperty({ type: Number })
  charCount: number;

  @ApiProperty({ type: PromptInjectionTogglesDto })
  toggles: PromptInjectionTogglesDto;

  @ApiProperty({
    type: [PromptPreviewSectionDto],
    description: '逐段拆解（设置页/排查用）',
  })
  sections: PromptPreviewSectionDto[];
}

/* ---------------- 注入率统计（增强 C） ---------------- */

export class PromptSectionUsageDto {
  @ApiProperty({ type: String, description: '段标识' })
  key: string;

  @ApiProperty({ type: Number, description: '样本中出现次数' })
  count: number;

  @ApiProperty({ type: Number, description: '注入率（0~1）' })
  ratio: number;

  @ApiProperty({ type: Number, description: '平均字符数' })
  avgChars: number;
}

export class PromptUsageStatsResponseDto {
  @ApiProperty({ type: Number, description: '采样执行条数上限' })
  sampleSize: number;

  @ApiProperty({
    type: Number,
    description: '其中带完整 prompt 载荷的条数（0 = 无样本）',
  })
  promptCount: number;

  @ApiProperty({ type: Number, description: '平均整条 prompt 字符数' })
  avgPromptChars: number;

  @ApiProperty({ type: [PromptSectionUsageDto] })
  sections: PromptSectionUsageDto[];
}

/* ---------------- 提示词模板库（增强 A） ---------------- */

export class PromptTemplateDto {
  @ApiProperty({ type: String, description: '内置模板为 builtin: 前缀 key' })
  id: string;

  @ApiProperty({ type: String })
  name: string;

  @ApiProperty({ type: String })
  description: string;

  @ApiProperty({ type: String, enum: ['task', 'project', 'role', 'member'] })
  target: string;

  @ApiProperty({ type: String, enum: ['workspace', 'project'] })
  scope: string;

  @ApiProperty({ type: String, nullable: true })
  projectId: string | null;

  @ApiProperty({ type: String, description: 'markdown 正文（含 {{变量}}）' })
  body: string;

  @ApiProperty({ type: Boolean, description: '内置模板只读不可删' })
  builtIn: boolean;

  @ApiProperty({ type: [String], description: '正文中的插值变量' })
  variables: string[];
}

export class PromptTemplateListResponseDto {
  @ApiProperty({ type: [PromptTemplateDto] })
  items: PromptTemplateDto[];
}

export class CreatePromptTemplateDto {
  @ApiProperty({ type: String })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string;

  @ApiProperty({ type: String, required: false })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiProperty({ type: String, enum: ['task', 'project', 'role', 'member'] })
  @IsIn(['task', 'project', 'role', 'member'])
  target: string;

  @ApiProperty({ type: String, enum: ['workspace', 'project'] })
  @IsIn(['workspace', 'project'])
  scope: string;

  @ApiProperty({
    type: String,
    required: false,
    description: 'scope=project 时必填',
  })
  @IsOptional()
  @IsString()
  projectId?: string;

  @ApiProperty({ type: String })
  @IsString()
  @MinLength(1)
  @MaxLength(20000)
  body: string;
}

export class UpdatePromptTemplateDto {
  @ApiProperty({ type: String, required: false })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name?: string;

  @ApiProperty({ type: String, required: false })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiProperty({ type: String, required: false })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(20000)
  body?: string;
}

export class PromptTemplatePreviewRequestDto {
  @ApiProperty({ type: String, description: '模板正文（含 {{变量}}）' })
  @IsString()
  @MinLength(1)
  @MaxLength(20000)
  body: string;

  @ApiProperty({ type: String, description: '插值事实来源工单' })
  @IsString()
  issueId: string;
}

export class PromptTemplatePreviewResponseDto {
  @ApiProperty({ type: String })
  issueId: string;

  @ApiProperty({ type: String, description: '模板原文' })
  body: string;

  @ApiProperty({ type: String, description: '插值后的正文' })
  text: string;

  @ApiProperty({
    type: [String],
    description: '事实缺失保留占位的变量清单',
  })
  missingVars: string[];
}
