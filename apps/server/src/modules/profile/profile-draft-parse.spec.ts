import {
  extractBalancedJsonObject,
  tryParseProfileDraft,
  validateProfileDraft,
} from './profile-draft.schema';
import { ProfileService } from './profile.service';
import { PrismaService } from '../../core/database/prisma.service';

/** 考古产物最后一公里容错：围栏 JSON / 包裹字段 / 文本内嵌 JSON 的提取与校验 */

const validDraft = {
  schemaVersion: 1,
  slots: [
    {
      slot: 'tech-stack',
      items: [
        { content: '前端 React 19', confidence: 0.6, evidence: 'package.json' },
      ],
    },
  ],
  summary: 'React 项目',
};

describe('tryParseProfileDraft / extractBalancedJsonObject', () => {
  it('对象原样透传', () => {
    expect(tryParseProfileDraft(validDraft)).toEqual(validDraft);
  });

  it('裸 JSON 字符串解析成功', () => {
    expect(tryParseProfileDraft(JSON.stringify(validDraft))).toEqual(
      validDraft,
    );
  });

  it('markdown 围栏包裹的 JSON 提取成功', () => {
    const fenced = '```json\n' + JSON.stringify(validDraft, null, 2) + '\n```';
    expect(tryParseProfileDraft(fenced)).toEqual(validDraft);
  });

  it('前后带说明文字的内嵌 JSON 提取成功', () => {
    const noisy =
      '好的，以下是扫描结果：\n' + JSON.stringify(validDraft) + '\n以上。';
    expect(tryParseProfileDraft(noisy)).toEqual(validDraft);
  });

  it('包裹对象（response 字段为文本内嵌 JSON）下钻成功', () => {
    const wrapped = {
      response: `结论如下\n${JSON.stringify(validDraft)}`,
    };
    expect(tryParseProfileDraft(wrapped)).toEqual(validDraft);
  });

  it('字符串含引号转义时花括号配平不错切', () => {
    const tricky = {
      ...validDraft,
      slots: [
        {
          slot: 'conventions',
          items: [{ content: '提交信息用「fix:」前缀 {"strict": true}' }],
        },
      ],
    };
    const noisy = '结果 ' + JSON.stringify(tricky) + ' 完';
    expect(tryParseProfileDraft(noisy)).toEqual(tricky);
  });

  it('无法解析时原样返回（交由 validate 如实报错）', () => {
    expect(tryParseProfileDraft('完全没有 JSON')).toBe('完全没有 JSON');
  });

  it('extractBalancedJsonObject 返回首个配平对象', () => {
    const text = 'x {"a":{"b":1}} y {"c":2}';
    expect(extractBalancedJsonObject(text)).toBe('{"a":{"b":1}}');
    expect(extractBalancedJsonObject('no braces')).toBeNull();
  });

  it('容错产物通过 validateProfileDraft', () => {
    const wrapped = {
      output: { response: '```json\n' + JSON.stringify(validDraft) + '\n```' },
    };
    const parsed = validateProfileDraft(tryParseProfileDraft(wrapped));
    expect(parsed.valid).toBe(true);
  });
});

describe('ingestArchaeology 容错回落（output 内嵌文本 JSON）', () => {
  it('output.response 内嵌 JSON 时照常落草稿', async () => {
    const execution = {
      id: 'exec1',
      projectId: 'p1',
      status: 'completed',
      output: { response: `扫描完成\n${JSON.stringify(validDraft)}` },
      createdBy: 'u1',
      artifacts: [],
    };
    const created: unknown[] = [];
    const prisma = {
      execution: {
        findUnique: jest.fn(async () => execution),
      },
      memoryAtom: {
        findFirst: jest.fn(async () => null),
        create: jest.fn(async ({ data }: { data: Record<string, unknown> }) => {
          created.push(data);
          return {
            id: 'a1',
            updatedAt: new Date(),
            createdAt: new Date(),
            ...data,
          };
        }),
      },
      activity: { create: jest.fn(async () => ({})) },
    };
    const service = new ProfileService(prisma as unknown as PrismaService);
    const result = await service.ingestArchaeology('p1', 'exec1', 'u1');
    expect(result.created).toBe(1);
    expect(created[0]).toMatchObject({
      slot: 'tech-stack',
      lifecycle: 'working',
      sourceType: 'tool',
      sourceEventId: 'exec1',
    });
  });
});
