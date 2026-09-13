import { Rocket, type LucideIcon } from 'lucide-react';
import { getEntityIcon } from '@/shared/entity-icons/entity-icons';

/**
 * 研发生命周期六站（CAP-A-15）——与能力清单 §2.2 理想管道①-⑥一一对应。
 * 唯一定义源：侧边栏 pipeline 分组与测试共用，保证「导航即流程」不被页面枚举侵蚀。
 * 语义边界：实验位（ai-surface）、mock 位（delivery）、页面枚举位（bugs）不得入列。
 */
export interface PipelineStage {
  to: string;
  icon: LucideIcon;
  labelKey: string;
  labelFallback: string;
  stageNumber: string;
  hintKey: string;
  hintFallback: string;
}

export const PIPELINE_STAGES: PipelineStage[] = [
  {
    to: '/app/intake',
    icon: getEntityIcon('document').icon,
    labelKey: 'nav.intake',
    labelFallback: '需求承接',
    stageNumber: '01',
    hintKey: 'shell.stageIntake',
    hintFallback: '需求承接',
  },
  {
    to: '/app/issues',
    icon: getEntityIcon('issue').icon,
    labelKey: 'nav.tasks',
    labelFallback: '任务',
    stageNumber: '02',
    hintKey: 'shell.stagePlanning',
    hintFallback: '规划拆解',
  },
  {
    to: '/app/repositories',
    icon: getEntityIcon('repository').icon,
    labelKey: 'git.title',
    labelFallback: '仓库',
    stageNumber: '03',
    hintKey: 'shell.stageExecution',
    hintFallback: '代码研发',
  },
  {
    to: '/app/executions',
    icon: getEntityIcon('execution').icon,
    labelKey: 'nav.executions',
    labelFallback: '执行记录',
    stageNumber: '04',
    hintKey: 'shell.stageDispatch',
    hintFallback: '派发执行',
  },
  {
    to: '/app/acceptance',
    icon: getEntityIcon('acceptance').icon,
    labelKey: 'nav.acceptance',
    labelFallback: '质量验收',
    stageNumber: '05',
    hintKey: 'shell.stageAcceptance',
    hintFallback: '质量验收',
  },
  {
    to: '/app/releases',
    icon: Rocket,
    labelKey: 'nav.releases',
    labelFallback: '发版交付',
    stageNumber: '06',
    hintKey: 'shell.stageDelivery',
    hintFallback: '交付发布',
  },
];
