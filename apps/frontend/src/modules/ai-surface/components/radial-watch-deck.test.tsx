import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { StationCard } from '../adapters/office-to-station';
import { RadialWatchDeck } from './radial-watch-deck';
import { MEMORY_ATOMS } from '../mock-data';

/**
 * S2-e 诚实粒度降级守卫。
 *
 * 本文件把「清零」钉死在测试里——它守的不是"渲染对不对"，而是**不许复活**：
 * 下面每一条断言对应的，都是实测无口径却长得像实时遥测的呈现，它们的共同危害是
 * 与真数据**同屏**（左侧工位卡的信度分、页面上方泳道的计数都是真的），读者无从分辨。
 *
 * 三条纪律：
 * ① 数字型遥测（百分比 / 等级 / 活性读数）一律清零，而不是"标成示例"就算完；
 * ② 清零之后必须给**去向**（该数在哪个真实页面/模块），不能只留一句"没有"；
 * ③ 叙事型示例内容可以留，但必须在**区域标题旁就地**标注（不是页头那枚隔着整屏的徽标）。
 */

const renderDeck = (over: Partial<Parameters<typeof RadialWatchDeck>[0]> = {}) =>
  render(
    <RadialWatchDeck
      stations={[]}
      stationsStatus="ready"
      selectedAgentId={null}
      onSelectAgent={vi.fn()}
      memoryAtoms={MEMORY_ATOMS}
      artifacts={{}}
      messages={[]}
      isDark
      {...over}
    />,
  );

describe('RadialWatchDeck（S2-e 诚实粒度）', () => {
  it('右侧信度列的编造百分比全部清零（四个维度一个都不留）', () => {
    renderDeck();

    // 原实现的硬编码值：项目信度 95.4 / 契约合规 99.2 / 逻辑完备 94.5 / 幻觉抑制 97.0 / Token ROI 92.8
    for (const fake of ['95.4', '99.2%', '94.5%', '97.0%', '92.8%']) {
      expect(screen.queryByText(fake)).not.toBeInTheDocument();
    }
    // 连"四维雷达矩阵"这个把假数排成矩阵的容器也不该再有内容可读
    expect(screen.queryByText('多维加权模型')).not.toBeInTheDocument();
    expect(screen.queryByText('幻觉抑制')).not.toBeInTheDocument();
    expect(screen.queryByText('Token ROI')).not.toBeInTheDocument();
  });

  it('清零不是留白：每张无口径卡都要说明该去哪看真数', () => {
    renderDeck();

    // 项目信度总分 → 无项目级口径，改指工位卡（office 真口径）与仪表盘健康分
    expect(screen.getByText(/项目级信度聚合接口/)).toBeInTheDocument();
    expect(screen.getByText(/项目健康分见仪表盘/)).toBeInTheDocument();
    // 契约合规率 → 指向 contract:check（构建结论，不是运行时可读数）
    expect(screen.getByText(/由 CI 的 contract:check 判定/)).toBeInTheDocument();
    expect(screen.getByText(/pnpm contract:check 的输出为准/)).toBeInTheDocument();
    // Token 产出比 → 指向工位卡的本周消耗
    expect(screen.getByText(/见左侧工位卡的「本周 tokens/)).toBeInTheDocument();
  });

  it('信任等级与零漂移徽标不得复活（服务端无这两个字段）', () => {
    renderDeck();

    expect(screen.queryByText('LEVEL 3 准自主')).not.toBeInTheDocument();
    expect(screen.queryByText('ZERO DRIFT 零漂移')).not.toBeInTheDocument();
    expect(screen.queryByText('单库隔离路由生效')).not.toBeInTheDocument();
    expect(screen.queryByText(/实体隔离推演完毕/)).not.toBeInTheDocument();
  });

  it('表盘两条常驻 HUD 的编造读数已删除，且无假成功动作按钮', () => {
    renderDeck();

    // 表盘标题栏：CAP-P-01 徽章 / 96.4% 活力 / 零漂移
    expect(screen.queryByText('96.4% 活力')).not.toBeInTheDocument();
    expect(screen.queryByText(/^零漂移$/)).not.toBeInTheDocument();
    // 表盘底部 HUD：LEVEL 3 准自主 · OPENAPI ZERO-DRIFT · 4/5 准则闭环
    expect(screen.queryByText('OPENAPI ZERO-DRIFT')).not.toBeInTheDocument();
    expect(screen.queryByText('4/5 准则闭环')).not.toBeInTheDocument();
    // 原「准入」按钮：点击只改本地 state 显示「已准入」= 假成功 + 第二个拍板入口
    expect(screen.queryByRole('button', { name: /准入/ })).not.toBeInTheDocument();
    expect(screen.queryByText('已准入')).not.toBeInTheDocument();
  });

  it('示例内容就地标注：记忆原子卡自带「示例」，不靠页头徽标', () => {
    renderDeck();

    const card = document.querySelector('[data-ai-component="ai-surface.station-card"]');
    // 无同事时不该有工位卡（S2-b 的不补假人），此处顺带确认本页没有真数据混杂
    expect(card).toBeNull();

    const tags = document.querySelectorAll('[data-ai-component="ai-surface.sample-tag"]');
    // 表盘标题栏 1 枚 + 记忆原子卡 1 枚
    expect(tags.length).toBe(2);
    expect(screen.getByText('治理记忆星云原子')).toBeInTheDocument();
  });

  it('记忆原子只留示例条目本身，不再渲染编造的活性计数与权重', () => {
    renderDeck();

    expect(screen.getByText(`${MEMORY_ATOMS.length} 条`)).toBeInTheDocument();
    expect(screen.queryByText(/ATOMS ACTIVE/)).not.toBeInTheDocument();
    expect(screen.queryByText(/权重 \d+%/)).not.toBeInTheDocument();
  });
});

/**
 * S2 成本口径：单次执行的 token/成本（`runtime.execution.result` 的 usage）。
 *
 * 与「本周 …」那行**是两套口径**，这里把两者的并存与各自的缺席行为都钉住——
 * 混用会让人把周报读成单次花费。
 */
describe('RadialWatchDeck（单次执行成本）', () => {
  const station = (over: Partial<StationCard> = {}): StationCard => ({
    memberId: 'ai-1',
    displayName: '小码',
    title: '全栈工程师',
    status: 'working',
    blocking: 0,
    advisory: 0,
    trustScore: 88,
    run: {
      id: 'run-1',
      label: '办公室聚合端点',
      status: 'completed',
      statusSource: 'event',
    },
    progress: {
      source: 'result',
      text: '任务执行完成',
      status: 'completed',
      usage: {
        promptTokens: 900,
        completionTokens: 100,
        totalTokens: 1000,
        costUsd: 0.42,
      },
      artifactCount: 3,
      at: 1000,
      eventName: 'runtime.execution.result',
    },
    capacity: {
      activeRuns: 1,
      capacityLimit: 5,
      loadPct: 20,
      acceptability: 'available',
      weeklyTokens: 42000,
      weeklyCostUsd: 3.5,
    },
    ...over,
  });

  it('CLI 上报了 usage 就显示「本次」，且与「本周」标签不同时出现混用', () => {
    renderDeck({ stations: [station()] });

    expect(screen.getByText('任务执行完成')).toBeInTheDocument();
    expect(screen.getByText('本次 1.0k tokens · $0.42 · 工件 3')).toBeInTheDocument();
    // 周报口径仍在，两者标签可区分（本次 / 本周）
    expect(screen.getByText(/本周 42\.0k tokens/)).toBeInTheDocument();
  });

  it('未上报 usage 时整行不渲染——不补 0，也不写"未知"占位', () => {
    renderDeck({
      stations: [
        station({
          progress: {
            source: 'result',
            text: '编译失败',
            status: 'failed',
            at: 1000,
            eventName: 'runtime.execution.result',
          },
        }),
      ],
    });

    expect(screen.getByText('编译失败')).toBeInTheDocument();
    expect(screen.queryByText(/本次 /)).not.toBeInTheDocument();
    // 没有成本行，但周报行该在还在
    expect(screen.getByText(/本周 42\.0k tokens/)).toBeInTheDocument();
  });

  it('缺少 artifacts 时只显示用量，不凭空补「工件 0」', () => {
    renderDeck({
      stations: [
        station({
          progress: {
            source: 'result',
            text: '任务执行完成',
            status: 'completed',
            usage: { promptTokens: 900, completionTokens: 100, totalTokens: 1000 },
            at: 1000,
            eventName: 'runtime.execution.result',
          },
        }),
      ],
    });

    // 无 costUsd → 不编 $0.00，只写 token
    expect(screen.getByText('本次 1.0k tokens')).toBeInTheDocument();
    expect(screen.queryByText(/工件/)).not.toBeInTheDocument();
  });
});
