import { BadRequestException } from '@nestjs/common';
import {
  FIELD_SCHEMA_TYPES,
  IssueTypeService,
  validateCustomFields,
  validateFieldSchema,
} from './issue-type.service';

describe('类型管理面扩展：字段类型 / defaultValue / description / enabled（GAP-T-25）', () => {
  it('FIELD_SCHEMA_TYPES 扩展九种：boolean/member/url 可通过校验', () => {
    expect(FIELD_SCHEMA_TYPES).toContain('boolean');
    expect(FIELD_SCHEMA_TYPES).toContain('member');
    expect(FIELD_SCHEMA_TYPES).toContain('url');

    const schema = validateFieldSchema([
      { key: 'blocked', label: '是否阻塞', type: 'boolean' },
      { key: 'owner', label: '负责人', type: 'member' },
      { key: 'ref', label: '参考链接', type: 'url' },
    ]);
    expect(schema?.map((d) => d.type)).toEqual(['boolean', 'member', 'url']);
  });

  it('select 默认值必须在 options 内；合法默认值与描述/启用位规范化保留', () => {
    expect(() =>
      validateFieldSchema([
        {
          key: 'sev',
          label: '严重度',
          type: 'select',
          options: ['high', 'low'],
          defaultValue: 'ultra',
        },
      ]),
    ).toThrow(BadRequestException);

    const schema = validateFieldSchema([
      {
        key: 'sev',
        label: '严重度',
        type: 'select',
        options: ['high', 'low'],
        defaultValue: 'high',
        description: '缺陷严重度',
        enabled: false,
      },
      {
        key: 'note',
        label: '备注',
        type: 'text',
        description: '',
        defaultValue: '',
        enabled: true,
      },
    ]);
    expect(schema?.[0]?.defaultValue).toBe('high');
    expect(schema?.[0]?.description).toBe('缺陷严重度');
    expect(schema?.[0]?.enabled).toBe(false);
    // 空串/true 规范化为不落字段
    expect(schema?.[1]?.description).toBeUndefined();
    expect(schema?.[1]?.defaultValue).toBeUndefined();
    expect(schema?.[1]?.enabled).toBeUndefined();
  });

  it('customFields：boolean 必须布尔、url 必须 http(s)、member 字符串口径', () => {
    const schema = validateFieldSchema([
      { key: 'blocked', label: '是否阻塞', type: 'boolean' },
      { key: 'ref', label: '参考链接', type: 'url' },
      { key: 'owner', label: '负责人', type: 'member' },
    ]);
    expect(() =>
      validateCustomFields(schema, { blocked: 'yes' }, 'create'),
    ).toThrow(BadRequestException);
    expect(validateCustomFields(schema, { blocked: false }, 'create')).toEqual({
      blocked: false,
    });
    expect(() =>
      validateCustomFields(schema, { ref: 'ftp://x' }, 'create'),
    ).toThrow(BadRequestException);
    expect(
      validateCustomFields(schema, { ref: 'https://apm.dev' }, 'create'),
    ).toEqual({
      ref: 'https://apm.dev',
    });
    expect(
      validateCustomFields(schema, { owner: 'member-1' }, 'create'),
    ).toEqual({
      owner: 'member-1',
    });
  });
});

describe('IssueTypeService 守卫：默认类型 task 不可禁用', () => {
  function buildService(existingType: { id: string; key: string }) {
    const update = vi.fn().mockResolvedValue(existingType);
    const findUnique = vi.fn().mockResolvedValue(existingType);
    const service = new IssueTypeService({
      issueType: { findUnique, update },
    } as never);
    return { service, update, findUnique };
  }

  it('enabled=false 于 task → 400 且不落库', async () => {
    const { service, update } = buildService({ id: 't1', key: 'task' });
    await expect(
      service.update('t1', { enabled: false } as never),
    ).rejects.toThrow(BadRequestException);
    expect(update).not.toHaveBeenCalled();
  });

  it('enabled=false 于自定义类型 → 正常更新', async () => {
    const { service, update } = buildService({ id: 't2', key: 'story' });
    await service.update('t2', { enabled: false } as never);
    expect(update).toHaveBeenCalledWith({
      where: { id: 't2' },
      data: { enabled: false },
    });
  });

  it('enabled=true 于 task → 放行（重新启用合法）', async () => {
    const { service, update } = buildService({ id: 't1', key: 'task' });
    await service.update('t1', { enabled: true } as never);
    expect(update).toHaveBeenCalled();
  });
});

describe('IssueTypeService 守卫：isSystem 内置类型不可删除', () => {
  function buildService(existingType: {
    id: string;
    key: string;
    isSystem?: boolean;
  }) {
    const remove = vi.fn().mockResolvedValue(existingType);
    const findUnique = vi.fn().mockResolvedValue(existingType);
    const count = vi.fn().mockResolvedValue(0);
    const service = new IssueTypeService({
      issueType: { findUnique, delete: remove },
      issue: { count },
    } as never);
    return { service, remove, count };
  }

  it('删除 isSystem bug 类型 → 400 且不落库', async () => {
    const { service, remove } = buildService({
      id: 't3',
      key: 'bug',
      isSystem: true,
    });
    await expect(service.remove('t3')).rejects.toThrow(BadRequestException);
    expect(remove).not.toHaveBeenCalled();
  });

  it('删除 isSystem task 类型 → 400（原守卫保留）', async () => {
    const { service, remove } = buildService({
      id: 't1',
      key: 'task',
      isSystem: true,
    });
    await expect(service.remove('t1')).rejects.toThrow(BadRequestException);
    expect(remove).not.toHaveBeenCalled();
  });

  it('删除非内置自定义类型（零引用）→ 正常删除', async () => {
    const { service, remove, count } = buildService({
      id: 't4',
      key: 'story',
      isSystem: false,
    });
    await service.remove('t4');
    expect(count).toHaveBeenCalledWith({ where: { typeId: 't4' } });
    expect(remove).toHaveBeenCalledWith({ where: { id: 't4' } });
  });
});
