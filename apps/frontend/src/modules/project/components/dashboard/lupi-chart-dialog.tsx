/**
 * LupiChartDialog - 图表精读全屏弹窗（图表双引擎·Lupi 层，CAP-C-06 切片 2026-09-30）
 *
 * 外壳 = ui/dialog size="full"（焦点陷阱/Esc/滚动锁由 base-ui 提供）；
 * 图区 = iframe srcDoc 注入参数化 lieflat 模板（模板自带纸面观感/结论标题/编码副标题/
 * 来源行四件套，不随应用主题切换）；数据契约占位符（模板内注释槽）注入 JSON 由
 * buildLupiSrcDoc 替换。「导出报告」仅预留（disabled，功能后续按 C 线立项）。
 */
import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { useTranslation } from '@/hooks/useTranslation';
import healthHairlineHtml from './lupi/health-hairline.html?raw';
import deliveryPairedRungsHtml from './lupi/delivery-paired-rungs.html?raw';

export type LupiChartKind = 'health' | 'delivery';

export interface LupiHairlinePayload {
  title: string;
  sub: string;
  src: string;
  /** 值域上限（健康分 100），缺省 100 */
  max?: number;
  points: Array<{ label: string; value: number }>;
}

export interface LupiPairedRungsPayload {
  title: string;
  sub: string;
  src: string;
  items: Array<{ label: string; done: number; created: number }>;
}

export type LupiPayload = LupiHairlinePayload | LupiPairedRungsPayload;

const TEMPLATES: Record<LupiChartKind, string> = {
  health: healthHairlineHtml,
  delivery: deliveryPairedRungsHtml,
};

/** 模板数据注入：替换占位为 JSON 字面量（模板侧空值回落演示数据） */
export function buildLupiSrcDoc(kind: LupiChartKind, payload: LupiPayload): string {
  return TEMPLATES[kind].replace('/*__CHART_DATA__*/null', JSON.stringify(payload));
}

export function LupiChartDialog({
  kind,
  payload,
  open,
  onClose,
}: {
  kind: LupiChartKind;
  payload: LupiPayload;
  open: boolean;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const srcDoc = useMemo(() => buildLupiSrcDoc(kind, payload), [kind, payload]);

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent size="full">
        <header className="flex items-center justify-between border-b border-border px-6 py-3">
          <DialogTitle>{t('dashboard.panel.lupiTitle')}</DialogTitle>
          <Badge variant="secondary">{t('dashboard.panel.lupiSource')}</Badge>
        </header>
        <div className="min-h-0 flex-1 px-6 py-4">
          <iframe
            title={t('dashboard.panel.lupiTitle')}
            srcDoc={srcDoc}
            sandbox="allow-scripts"
            className="h-full w-full rounded-xl bg-card ring-1 ring-border/50"
          />
        </div>
        <footer className="flex items-center justify-between border-t border-border px-6 py-3">
          <p className="text-xs text-muted-foreground">{t('dashboard.panel.lupiReplayHint')}</p>
          <Button variant="outline" size="sm" disabled title={t('dashboard.panel.lupiComingSoon')}>
            {t('dashboard.panel.lupiExport')}
          </Button>
        </footer>
      </DialogContent>
    </Dialog>
  );
}
