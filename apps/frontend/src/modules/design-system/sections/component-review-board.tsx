/**
 * 组件裁决面（Component Review Board）—— 让「人看」这一步真正可行
 *
 * 来源（人类原话）：**「组件仍然不删除，但是要在 design-system 页面标记，我看过后再删。」**
 * 三段式 = ① 标记（本区）→ ② **人看**（本区要兑现的那一步）→ ③ 才谈删（E 类方案批 9 执行）。
 *
 * 为什么单独建这个文件：
 * - `pages/design-system-page.tsx` 已 6000+ 行；E 类方案 §5.2 要求把设计系统页拆为
 *   `modules/design-system/sections/<section>.tsx`，本文件是该方向的第一个落点。
 * - 更重要：改造前该页**不 import registry.ts**，registry 里的 `review` / `standby`
 *   条目在页面上完全看不到 —— 第 ② 步（人看）做不到，流程卡死。本文件把
 *   `COMPONENT_REGISTRY` 单向渲染出来，页面引入本组件即打通同源链②（§5.2）。
 *
 * 边界（红线，勿越）：
 * - **只读**：不修改 registry、不改归属判定、不写任何裁决结论。删除动作只能由
 *   `component-review-decisions.json` 中已批准的条目驱动（§5.4），不由本区或 AI 自行判断。
 * - **零删除**：不新增 `deprecated` 态、不把任何条目标成 `deprecated`。
 * - 展示的每个字段都来自 `registry.ts` 的实际字段，**不臆造数据字段**；
 *   序号仅为页面展示序（便于口头/书面指认「第 N 条」），不是登记字段。
 */

import { useMemo, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  COMPONENT_REGISTRY,
  type ComponentEntry,
  type ComponentStatus,
} from '../registry'

/** 五态口径（E 类方案 §19.3）的页面标签。文案与 registry.ts 文件头一致。 */
const STATUS_META: Record<
  ComponentStatus,
  { label: string; badge: 'default' | 'secondary' | 'destructive' | 'outline' | 'ghost' }
> = {
  canonical: { label: 'canonical · 唯一实现', badge: 'secondary' },
  standby: { label: 'standby · 基线件', badge: 'outline' },
  internal: { label: 'internal · 内部件', badge: 'ghost' },
  review: { label: 'review · 待裁决', badge: 'destructive' },
  deprecated: { label: 'deprecated · 待清退', badge: 'destructive' },
}

/** 建议动作的中文对照（值域来自 registry.ts 的 `review.proposal`，不增不改）。 */
const PROPOSAL_LABEL: Record<
  NonNullable<ComponentEntry['review']>['proposal'],
  string
> = {
  delete: '建议清退',
  merge: '建议合并',
  keep: '建议保留',
  rename: '建议改名',
  standby: '建议转基线件',
}

function EntryCard({ entry, serial }: { entry: ComponentEntry; serial: string }) {
  const meta = STATUS_META[entry.status]
  return (
    <div className="rounded-lg border border-border bg-muted/20 p-3.5 space-y-1.5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-3xs font-mono text-muted-foreground shrink-0">
          {serial}
        </span>
        <span className="text-xs font-semibold font-mono text-foreground">
          {entry.name}
        </span>
        <Badge variant={meta.badge}>{meta.label}</Badge>
        {entry.review && (
          <span className="text-3xs text-muted-foreground">
            {PROPOSAL_LABEL[entry.review.proposal]}
            {entry.review.target ? ` → ${entry.review.target}` : ''}
          </span>
        )}
      </div>
      {/* 元数据行用模板串渲染成**单个文本节点**：字段拼接清晰，也便于断言逐条对齐 */}
      <p className="text-3xs font-mono text-muted-foreground break-all">
        {`${entry.file} · 登记分区 ${entry.section}`}
      </p>
      <p className="text-3xs text-muted-foreground">
        {`审阅期限 reviewBy：${entry.reviewBy ?? '未登记'} · 清退期限 expiresAt：${
          entry.expiresAt ?? '未登记'
        }`}
      </p>
      {entry.review?.reason && (
        <p className="text-2xs text-muted-foreground leading-relaxed">
          {`理由：${entry.review.reason}`}
        </p>
      )}
    </div>
  )
}

export function ComponentReviewBoard() {
  const [reviewOnly, setReviewOnly] = useState(false)

  const stats = useMemo(() => {
    const counts: Record<ComponentStatus, number> = {
      canonical: 0,
      standby: 0,
      internal: 0,
      review: 0,
      deprecated: 0,
    }
    for (const entry of COMPONENT_REGISTRY) counts[entry.status] += 1
    return counts
  }, [])

  const reviewEntries = useMemo(
    () => COMPONENT_REGISTRY.filter((e) => e.status === 'review'),
    [],
  )
  const standbyEntries = useMemo(
    () => COMPONENT_REGISTRY.filter((e) => e.status === 'standby'),
    [],
  )
  // 「方案建议动它」的条数（proposal = delete / merge）——由 registry 派生，不写死数字，
  // 让「哪些是真候选」一眼可见，但不做任何裁决。
  const reviewChangeCandidates = reviewEntries.filter(
    (e) => e.review?.proposal === 'delete' || e.review?.proposal === 'merge',
  ).length
  const standbyChangeCandidates = standbyEntries.filter(
    (e) => e.review?.proposal === 'delete' || e.review?.proposal === 'merge',
  ).length

  return (
    <div className="space-y-5">
      {/* 口径说明：贴住「原话」，避免后来者把本区误读成「即将删除清单」 */}
      <div className="rounded-lg border border-accent-yellow bg-accent-yellow-light/50 p-3.5 space-y-1.5">
        <p className="text-2xs font-semibold text-foreground">
          三段式：① 标记（本区，只读）→ ② 人看（你在这里逐条过目）→ ③ 才谈删（批 9 执行）
        </p>
        <p className="text-3xs text-muted-foreground leading-relaxed">
          人类的原话是「组件仍然不删除，但是要在 design-system 页面标记，我看过后再删」。
          本区不含任何删除动作：组件文件、测试、导出一律原样保留。
          数据来源为{' '}
          <code className="font-mono">modules/design-system/registry.ts</code>
          （单条即单行字面量，单向再生）；序号只是页面展示序（R#n = 待裁决项，S#n =
          基线件项），便于你指认「第 N 条」，不是登记字段。
          删除只能由 <code className="font-mono">component-review-decisions.json</code>{' '}
          中已批准的条目驱动。
        </p>
      </div>

      {/* 治理仪表：全部由 registry 实时统计，不写死数字 */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-lg border border-border p-3.5">
        <span className="text-3xs font-semibold text-muted-foreground uppercase tracking-wider">
          登记成分
        </span>
        <span className="text-3xs text-muted-foreground">
          总登记 <span className="font-mono text-foreground">{COMPONENT_REGISTRY.length}</span>
        </span>
        <span className="text-3xs text-muted-foreground">
          canonical <span className="font-mono text-foreground">{stats.canonical}</span>
        </span>
        <span className="text-3xs text-muted-foreground">
          standby <span className="font-mono text-foreground">{stats.standby}</span>
        </span>
        <span className="text-3xs text-muted-foreground">
          internal <span className="font-mono text-foreground">{stats.internal}</span>
        </span>
        <span className="text-3xs text-muted-foreground">
          review <span className="font-mono text-foreground">{stats.review}</span>
        </span>
        <span className="text-3xs text-muted-foreground">
          deprecated <span className="font-mono text-foreground">{stats.deprecated}</span>
        </span>
      </div>

      {/* 「只看待裁决」：§5.4 的关键筛选，让你一屏看完所有候选 */}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant={reviewOnly ? 'outline' : 'secondary'}
          size="xs"
          onClick={() => setReviewOnly(false)}
        >
          全部标记项（{reviewEntries.length + standbyEntries.length}）
        </Button>
        <Button
          variant={reviewOnly ? 'secondary' : 'outline'}
          size="xs"
          onClick={() => setReviewOnly(true)}
        >
          只看待裁决（{reviewEntries.length}）
        </Button>
        <span className="text-3xs text-muted-foreground">
          本区只读：看完的结论请落到{' '}
          <code className="font-mono">component-review-decisions.json</code>（批 9 执行删除）
        </span>
      </div>

      {/* 待裁决 review */}
      <div>
        <p className="text-3xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          {`待裁决 review（${reviewEntries.length}）——其中 ${reviewChangeCandidates} 条方案建议清退/合并`}
        </p>
        <div className="space-y-2.5">
          {reviewEntries.map((entry, i) => (
            <EntryCard key={entry.name} entry={entry} serial={`R#${i + 1}`} />
          ))}
        </div>
      </div>

      {/* 基线件 standby：D 项「先不删」集合，同样需要人看过 */}
      {!reviewOnly && (
        <>
          <Separator />
          <div>
            <p className="text-3xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              {`基线件 standby（${standbyEntries.length}）——当前无消费方、零维护成本；D 项裁决「先不删」，需你一并过目（其中 ${standbyChangeCandidates} 条方案建议清退/合并）`}
            </p>
            <div className="space-y-2.5">
              {standbyEntries.map((entry, i) => (
                <EntryCard key={entry.name} entry={entry} serial={`S#${i + 1}`} />
              ))}
            </div>
          </div>
        </>
      )}

      {/* 标记口径：让人看得懂每个标记意味着什么 */}
      <div className="rounded-lg border border-border p-3.5 space-y-1.5">
        <p className="text-3xs font-semibold text-muted-foreground uppercase tracking-wider">
          标记口径（E 类方案 §19.3 五态）
        </p>
        <p className="text-3xs text-muted-foreground leading-relaxed">
          canonical = 唯一实现且有真实消费方；standby = 候选件、当前无消费方、零维护成本；
          internal = 仅被其他 ui 组件消费；review = 待人类裁决（必带 reviewBy）；
          deprecated = 已有替代品待清退（必带 expiresAt，本区当前 0 条）。
          「建议…」徽标来自 registry 的 review.proposal 字段：review 与 standby
          两类条目都可能带它（standby 带 review 数据即 D 项「先标记、不删除」集合，§七 D）。
        </p>
        <p className="text-3xs text-muted-foreground leading-relaxed">
          本区不实现「review 逾期 → CI 失败」：该口径会向删除施压，而删除已被人类叫停，
          属待裁决项（见交付报告存疑清单）。当前 CI 只校验 review 态元数据完整性。
        </p>
      </div>
    </div>
  )
}
