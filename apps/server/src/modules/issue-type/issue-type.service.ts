import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { CreateIssueTypeDto, UpdateIssueTypeDto } from './dto/issue-type.dto';

// 内置不可删类型：所有任务的缺省类型
export const BUILTIN_LOCKED_TYPE_KEY = 'task';

// fieldSchema 允许的字段类型（4d 二期适配引擎）
export const FIELD_SCHEMA_TYPES = [
  'text',
  'textarea',
  'select',
  'multiselect',
  'number',
  'date',
] as const;

export type FieldSchemaDef = {
  key: string;
  label: string;
  type: (typeof FIELD_SCHEMA_TYPES)[number];
  required?: boolean;
  options?: string[];
  order?: number;
};

/**
 * 校验 fieldSchema 结构：数组、key 唯一且为 slug、类型合法、select/multiselect 必须带 options。
 * 返回按 order 排序后的规范化定义。
 */
export function validateFieldSchema(
  raw: unknown,
): FieldSchemaDef[] | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (!Array.isArray(raw)) {
    throw new BadRequestException('fieldSchema 必须是字段定义数组');
  }
  const seen = new Set<string>();
  const defs: FieldSchemaDef[] = raw.map((item) => {
    const def = item as Partial<FieldSchemaDef>;
    if (!def.key || !/^[a-zA-Z][a-zA-Z0-9_]{0,63}$/.test(def.key)) {
      throw new BadRequestException(
        `fieldSchema 字段 key 非法: ${String(def.key)}（字母开头，仅字母/数字/下划线）`,
      );
    }
    if (seen.has(def.key)) {
      throw new BadRequestException(`fieldSchema 字段 key 重复: ${def.key}`);
    }
    seen.add(def.key);
    if (!def.label || typeof def.label !== 'string') {
      throw new BadRequestException(`字段 ${def.key} 缺少 label`);
    }
    if (!FIELD_SCHEMA_TYPES.includes(def.type as never)) {
      throw new BadRequestException(
        `字段 ${def.key} 类型非法: ${String(def.type)}（允许：${FIELD_SCHEMA_TYPES.join('/')}）`,
      );
    }
    if (
      (def.type === 'select' || def.type === 'multiselect') &&
      (!Array.isArray(def.options) || def.options.length === 0)
    ) {
      throw new BadRequestException(
        `字段 ${def.key} 为 select/multiselect，必须提供 options`,
      );
    }
    return {
      key: def.key,
      label: def.label,
      type: def.type as FieldSchemaDef['type'],
      ...(def.required ? { required: true } : {}),
      ...(Array.isArray(def.options) ? { options: def.options } : {}),
      ...(typeof def.order === 'number' ? { order: def.order } : {}),
    };
  });
  return defs.sort((a, b) => (a.order ?? 100) - (b.order ?? 100));
}

/**
 * 按类型定义校验 customFields 值：
 * - 类型未定义 fieldSchema 时放行（兼容旧顶层字段直存的调用方，如 assistant 工具）
 * - 已定义时：未知 key 拒绝；select 值必须在 options 内、multiselect 为数组且子项在
 *   options 内、number 为数值、date 为 ISO 日期字符串
 * - required 仅在 create 强制（update 传 undefined 视为不改动）
 * 返回规范化后的对象；空输入返回 undefined（= 无改动）。
 */
export function validateCustomFields(
  schema: FieldSchemaDef[] | null | undefined,
  values: Record<string, unknown> | null | undefined,
  mode: 'create' | 'update',
): Record<string, unknown> | undefined {
  if (values === undefined) return undefined;
  const input = values ?? {};
  const defs = schema ?? [];
  if (defs.length === 0) {
    return Object.keys(input).length > 0 ? { ...input } : undefined;
  }
  const defsByKey = new Map(defs.map((d) => [d.key, d]));
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    const def = defsByKey.get(key);
    if (!def) {
      throw new BadRequestException(
        `自定义字段 ${key} 不在该类型的字段定义中（fieldSchema）`,
      );
    }
    if (value === null || value === '') {
      result[key] = null;
      continue;
    }
    if (def.type === 'number') {
      if (typeof value !== 'number' || Number.isNaN(value)) {
        throw new BadRequestException(`自定义字段 ${key} 必须是数值`);
      }
    } else if (def.type === 'select') {
      if (!def.options?.includes(String(value))) {
        throw new BadRequestException(
          `自定义字段 ${key} 取值必须是 ${def.options?.join('/')}`,
        );
      }
    } else if (def.type === 'multiselect') {
      if (
        !Array.isArray(value) ||
        !value.every((v) => def.options?.includes(String(v)))
      ) {
        throw new BadRequestException(
          `自定义字段 ${key} 必须是数组且取值限于 ${def.options?.join('/')}`,
        );
      }
    } else if (def.type === 'date') {
      if (typeof value !== 'string' || Number.isNaN(Date.parse(value))) {
        throw new BadRequestException(`自定义字段 ${key} 必须是日期字符串`);
      }
    } else if (typeof value !== 'string') {
      throw new BadRequestException(`自定义字段 ${key} 必须是字符串`);
    }
    result[key] = value;
  }
  if (mode === 'create') {
    for (const def of defs) {
      if (
        def.required &&
        result[def.key] === undefined &&
        input[def.key] === undefined
      ) {
        throw new BadRequestException(
          `缺少必填自定义字段: ${def.label}（${def.key}）`,
        );
      }
    }
  }
  return Object.keys(result).length > 0 ? result : undefined;
}

/**
 * 工单类型适配引擎 —— 类型元数据的唯一事实源。
 * Task.typeId 指向本表；icon/color/name 由本表驱动前端渲染，
 * 自定义类型与内置类型（task/bug）走同一套读写路径。
 */
@Injectable()
export class IssueTypeService {
  constructor(private readonly prisma: PrismaService) {}

  list(withUsage = false) {
    return this.prisma.issueType.findMany({
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
      ...(withUsage
        ? {
            include: {
              _count: { select: { issues: true } },
            },
          }
        : {}),
    });
  }

  async create(dto: CreateIssueTypeDto) {
    const existing = await this.prisma.issueType.findUnique({
      where: { key: dto.key },
    });
    if (existing) {
      throw new ConflictException(`类型 key 已存在: ${dto.key}`);
    }
    return this.prisma.issueType.create({
      data: {
        key: dto.key,
        name: dto.name,
        icon: dto.icon ?? 'Circle',
        color: dto.color ?? '#5E6AD2',
        order: dto.order ?? 100,
        fieldSchema: validateFieldSchema(dto.fieldSchema) ?? undefined,
      },
    });
  }

  async update(id: string, dto: UpdateIssueTypeDto) {
    await this.ensureExists(id);
    const data: Record<string, unknown> = { ...dto };
    if ('fieldSchema' in dto) {
      data.fieldSchema = validateFieldSchema(dto.fieldSchema) ?? null;
    }
    return this.prisma.issueType.update({ where: { id }, data });
  }

  async remove(id: string) {
    const type = await this.ensureExists(id);
    if (type.key === BUILTIN_LOCKED_TYPE_KEY) {
      throw new BadRequestException('内置类型 task 不可删除');
    }
    const usage = await this.prisma.issue.count({ where: { typeId: id } });
    if (usage > 0) {
      throw new ConflictException(
        `仍有 ${usage} 个任务使用该类型，请先迁移后再删除`,
      );
    }
    await this.prisma.issueType.delete({ where: { id } });
    return { deleted: true };
  }

  /** 按 key 解析类型（适配旧 type 字符串 → typeId 的桥接） */
  async resolveIdByKey(key: string): Promise<string | null> {
    const type = await this.prisma.issueType.findUnique({
      where: { key },
      select: { id: true },
    });
    return type?.id ?? null;
  }

  private async ensureExists(id: string) {
    const type = await this.prisma.issueType.findUnique({ where: { id } });
    if (!type) {
      throw new NotFoundException(`类型不存在: ${id}`);
    }
    return type;
  }
}
