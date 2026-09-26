/**
 * 提示词治理 DTO（CAP-A-24）
 */
import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

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

  @ApiProperty({ type: Boolean, description: '角色提示段（promptHint）' })
  role: boolean;

  @ApiProperty({ type: Boolean, description: '团队规则段（teamPrompt）' })
  team: boolean;

  @ApiProperty({
    type: Boolean,
    description: '成员个人提示词段（personalPrompt + 思考强度）',
  })
  member: boolean;

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
  role?: boolean;

  @ApiProperty({ type: Boolean, required: false })
  @IsOptional()
  @IsBoolean()
  team?: boolean;

  @ApiProperty({ type: Boolean, required: false })
  @IsOptional()
  @IsBoolean()
  member?: boolean;

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
    description: '项目级提示词全文；空串清空（删除配置）',
  })
  @IsOptional()
  @IsString()
  @MaxLength(20000)
  projectPrompt?: string;
}

export class PromptPreviewSectionDto {
  @ApiProperty({
    type: String,
    description:
      '段落标识：system/project/role/team/member/task/skills/taskBody/context/closing',
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
