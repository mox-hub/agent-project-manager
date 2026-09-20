import type { StationCard } from './office-to-station';

/**
 * 盯盘上下文注入（ARCH-AISURFACE-001 §3.2 代理态）。
 *
 * ## 它修的是一个"看起来生效了、其实没有"的信号
 *
 * OmniDock 的徽章此前写着「定向协同: @小码」，但派发出去的只有 `{content, projectId}`
 * ——AI 侧**完全不知道小码是谁**。徽章说有、对方收不到，正是本分支在清的同一类缺陷。
 * 本模块让那句话成真，并把徽章改成它实际做到的事（"附带上下文"，而非"定向到某人"
 * ——本系统的 `dispatch` 是把消息交给 CLI 执行，**不指定具体执行者**）。
 *
 * ## 为什么拼进 content，而不扩契约
 *
 * `assistantApi.dispatch()` 现签名只有 `(content, projectId)`；契约里
 * `AssistantViewingDto.type` 也没有工位/执行类型（最接近的 `member` 会落到
 * `formatViewingInstruction` 的文本分支）。扩契约要动 `openapi.json` + 服务端 DTO +
 * 两条消息通路，为一个前端上下文不值当。故取最小面：**拼进 content**。
 *
 * ## 只写"卡在哪"用得上的事实
 *
 * 刻意**不**把工位卡所有字段都塞进去（信度分、本周用量、预算百分比都不进）：
 * 上下文给得越多，模型越容易顺着数字编解释。这里只回答一个问题——
 * **这个人、这件事、卡在哪一步**。
 */

/** 执行状态来源的人话说明：快照是冷启动抓的，事件是后到的增量 */
const STATUS_SOURCE_LABEL: Record<string, string> = {
  snapshot: '来自快照，可能滞后',
  event: '来自执行终态事件',
};

/** 进展原话的形态说明（步骤级没有原话，只有节点名） */
function progressSentence(station: StationCard): string {
  const progress = station.progress;
  if (!progress) return '暂无逐条执行进展（只有状态级）';

  if (progress.source === 'step') {
    return progress.sequence === undefined
      ? `最近走到「${progress.label}」这一步`
      : `最近走到第 ${progress.sequence} 步「${progress.label}」`;
  }
  // runtime = 运行时自报原话；result = 执行终态文本。两者都是**原文搬运**，不加解释
  return progress.source === 'result'
    ? `执行终态：${progress.text}`
    : `最近一条进展：${progress.text}`;
}

/**
 * 由工位卡生成一段上下文；没有选中的同事时返回 `null`（**不造一段空上下文**）。
 *
 * 返回值是一段自带说明抬头的中文文本，直接拼进派发内容。
 */
export function buildStationContext(
  station: StationCard | null | undefined,
): string | null {
  if (!station) return null;

  const facts: string[] = [
    `同事：${station.displayName}（memberId: ${station.memberId}）`,
  ];

  if (station.run) {
    facts.push(`在做「${station.run.label}」`);
    const source = STATUS_SOURCE_LABEL[station.run.statusSource];
    facts.push(
      source
        ? `执行状态：${station.run.status}（${source}）`
        : `执行状态：${station.run.status}`,
    );
    // 开跑时刻是**事实陈述**（"从几点开始跑"），不是"卡了多久"——
    // 工位卡没有阻塞起始时刻，附一个"已耗时"会让模型顺着说一个无据的时长
    if (station.run.startedAt) facts.push(`本次执行开跑于 ${station.run.startedAt}`);
  } else {
    facts.push('当前没有在执行的事');
  }

  facts.push(progressSentence(station));

  if (station.blocking > 0) facts.push(`手上有 ${station.blocking} 项阻断待决`);
  if (station.advisory > 0) facts.push(`${station.advisory} 项非阻断待决`);

  return `[盯盘上下文 · 由盯盘面随消息自动附带]\n${facts.join('；')}`;
}

/**
 * 组装真正发出去的那段文本——**回显用同一份**。
 *
 * 回显与派发共用此函数是个刻意选择：盯盘面的用户（小白团队）不该去猜
 * "AI 到底收到了什么"。既有实现里 `[model: …]` 标记只发不回显，已是一处小分歧，
 * 此处不再叠加第二处。
 */
export function composeSurfaceDispatch(
  text: string,
  options: { model?: string; station?: StationCard | null } = {},
): string {
  const blocks = [text];
  const context = buildStationContext(options.station);
  if (context) blocks.push(context);
  // 与既有口径一致：'auto' 是"由系统选"，不是一个要告知的模型名
  if (options.model && options.model !== 'auto') {
    blocks.push(`[model: ${options.model}]`);
  }
  return blocks.join('\n\n');
}
