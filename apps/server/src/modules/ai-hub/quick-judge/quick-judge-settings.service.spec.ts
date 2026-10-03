import { describe, expect, it, vi } from 'vitest';
import { QuickJudgeSettingsService } from './quick-judge-settings.service';

/** CAP-A-27 扩展批：每场景介入开关的持久化语义（增量合并 + 畸形丢弃 + 缺省回落） */

function buildDeps(existingValue: unknown) {
  const rows =
    existingValue === undefined ? [] : [{ id: 'cfg1', value: existingValue }];
  const prisma = {
    appConfig: {
      findFirst: vi.fn(async () => rows[0] ?? null),
      update: vi.fn(async ({ data }: any) => data),
      create: vi.fn(async ({ data }: any) => data),
    },
  };
  return new QuickJudgeSettingsService(prisma as any);
}

describe('QuickJudgeSettingsService（场景介入开关）', () => {
  it('无配置 → 缺省（enabled=false、scenarios 空对象）', async () => {
    const svc = buildDeps(undefined);
    const s = await svc.getSettings();
    expect(s.enabled).toBe(false);
    expect(s.scenarios).toEqual({});
    expect(s.provider).toBe('opencode-go');
  });

  it('读已存配置：只收布尔值键，非布尔静默丢弃', async () => {
    const svc = buildDeps({
      enabled: true,
      scenarios: {
        approval_risk: false,
        bad_key: 'yes',
        trust_evaluation: true,
      },
    });
    const s = await svc.getSettings();
    expect(s.enabled).toBe(true);
    expect(s.scenarios).toEqual({
      approval_risk: false,
      trust_evaluation: true,
    });
  });

  it('update 合并语义：传键覆盖、未传键保留（增量合并）', async () => {
    const svc = buildDeps({
      enabled: true,
      scenarios: { approval_risk: false, contract_drift: false },
    });
    const next = await svc.updateSettings({
      scenarios: { approval_risk: true },
    });
    expect(next.scenarios).toEqual({
      approval_risk: true,
      contract_drift: false,
    });
    // update 写库的 value.scenarios 已含合并结果
    const arg = (svc as any).prisma.appConfig.update.mock.calls[0][0];
    expect(arg.data.value.scenarios).toEqual({
      approval_risk: true,
      contract_drift: false,
    });
  });

  it('update 畸形 scenarios（非对象/非布尔值）不炸且被清洗', async () => {
    const svc = buildDeps({
      enabled: true,
      scenarios: { approval_risk: false },
    });
    const next = await svc.updateSettings({
      scenarios: { trust_evaluation: 'yes', evidence_precheck: false } as any,
    });
    expect(next.scenarios).toEqual({
      approval_risk: false,
      evidence_precheck: false,
    });
  });

  it('读异常 → 回落缺省（绝不因配置坏而抛）', async () => {
    const prisma = {
      appConfig: {
        findFirst: vi.fn(async () => {
          throw new Error('db down');
        }),
        update: vi.fn(),
        create: vi.fn(),
      },
    };
    const svc = new QuickJudgeSettingsService(prisma as any);
    const s = await svc.getSettings();
    expect(s.enabled).toBe(false);
    expect(s.scenarios).toEqual({});
  });
});
