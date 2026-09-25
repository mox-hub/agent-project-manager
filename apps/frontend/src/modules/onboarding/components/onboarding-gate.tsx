/**
 * 首启引导门控（CAP-A-14 体验切片；P2-27 起 Web 端同样生效）：
 * 初始化向导未完成时自动弹出 OnboardingWizard——
 * 欢迎（含 AI 同事说明）→ 创建项目 → 连接仓库 → 配置 AI → 完成；
 * 桌面模式额外在欢迎后插入「工作目录」步骤（见 use-onboarding.buildSteps）。
 * 除登录外全部可跳过。完成标记沿用既有机制：zustand persist（localStorage）
 * 持久化；桌面端另镜像到壳侧（动态端口漂移换 origin 后不重弹），Web 端仅 localStorage。
 */
import { useAppStore } from '@/infrastructure/store/app-store';
import { OnboardingWizard } from '../pages/onboarding-wizard';

export function OnboardingGate() {
  const onboardingCompleted = useAppStore((state) => state.onboardingCompleted);

  if (onboardingCompleted) {
    return null;
  }

  return <OnboardingWizard />;
}
