import { BadRequestException } from '@nestjs/common';
import {
  validateCustomFields,
  validateFieldSchema,
} from './issue-type.service';
import {
  toCustomFieldsInput,
  withBuiltinCompat,
} from '../../common/utils/issue-custom-fields.util';

describe('阶段四 fieldSchema / customFields 适配引擎', () => {
  const bugSchema = validateFieldSchema([
    {
      key: 'severity',
      label: '严重度',
      type: 'select',
      options: ['critical', 'high', 'medium', 'low'],
      order: 1,
    },
    { key: 'bugEnvironment', label: '环境', type: 'textarea', order: 2 },
  ]);

  it('fieldSchema：select 缺 options 拒绝；key 重复拒绝', () => {
    expect(() =>
      validateFieldSchema([{ key: 'a', label: 'A', type: 'select' }]),
    ).toThrow(BadRequestException);
    expect(() =>
      validateFieldSchema([
        { key: 'a', label: 'A', type: 'text' },
        { key: 'a', label: 'A2', type: 'text' },
      ]),
    ).toThrow(BadRequestException);
  });

  it('customFields：未知 key 拒绝，select 取值受限', () => {
    expect(() =>
      validateCustomFields(bugSchema, { unknownField: 'x' }, 'create'),
    ).toThrow(BadRequestException);
    expect(() =>
      validateCustomFields(bugSchema, { severity: 'ultra' }, 'create'),
    ).toThrow(BadRequestException);
    expect(
      validateCustomFields(bugSchema, { severity: 'high' }, 'create'),
    ).toEqual({ severity: 'high' });
  });

  it('customFields：required 仅 create 强制', () => {
    const schema = validateFieldSchema([
      { key: 'env', label: '环境', type: 'text', required: true },
    ]);
    expect(() => validateCustomFields(schema, {}, 'create')).toThrow(
      BadRequestException,
    );
    // update 空输入返回 undefined = 无改动（required 不强制）
    expect(validateCustomFields(schema, {}, 'update')).toBeUndefined();
  });

  it('toCustomFieldsInput：顶层旧字段并入，显式 customFields 优先', () => {
    const merged = toCustomFieldsInput(
      { severity: 'low' },
      { severity: 'high', customFields: { severity: 'medium', extra: 1 } },
    );
    expect(merged).toEqual({ severity: 'medium', extra: 1 });
  });

  it('withBuiltinCompat：customFields 内置键回填顶层，其余不动', () => {
    const out = withBuiltinCompat({
      id: 'i1',
      title: 'T',
      customFields: { severity: 'high', customA: 'x' },
    });
    expect(out.severity).toBe('high');
    expect(out.bugEnvironment).toBeUndefined();
    expect(out.title).toBe('T');
  });
});
