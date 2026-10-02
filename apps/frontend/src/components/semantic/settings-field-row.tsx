/**
 * SettingsFieldRow - 设置字段行（左说明右控件，2026-10-01 设置页语义组件批二）
 *
 * 设置页「左 label + helper 说明、右 Switch/Select 控件」的三段行骨架，
 * 收编 settings 域 10+ 处同构散写（flex justify-between + rounded-lg border p-3 基准，
 * 形态逐字沿袭 dock-section 等既有写法）。控件不传时整行退化为说明行。
 * 与 DefinitionRow 的分工：本件是表单控件行（无点击导航语义），DefinitionRow 是
 * 定义类管理行的行卡（点击编辑/拖拽）；勿混用。
 * props 面封闭（G8）：不接 className、不透传样式。
 */
import type { ReactNode } from 'react';

export interface SettingsFieldRowProps {
  /** 字段名（左列首行，text-sm） */
  title: ReactNode;
  /** helper 说明（左列第二行，text-xs 次级色；约束说明也放这里） */
  description?: ReactNode;
  /** 右侧控件（Switch / Select / Input 等）；不传则不渲染控件槽 */
  control?: ReactNode;
}

export function SettingsFieldRow({ title, description, control }: SettingsFieldRowProps) {
  return (
    <div
      data-slot="settings-field-row"
      className="flex items-center justify-between gap-4 rounded-lg border border-border p-3"
    >
      <div className="min-w-0">
        <p className="m-0 text-sm text-foreground">{title}</p>
        {description ? <p className="mt-0.5 text-xs text-muted-foreground">{description}</p> : null}
      </div>
      {control ? <div className="shrink-0">{control}</div> : null}
    </div>
  );
}
