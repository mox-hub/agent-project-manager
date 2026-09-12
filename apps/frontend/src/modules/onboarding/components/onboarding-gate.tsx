/**
 * 桌面端首启引导门控（CAP-A-14 体验切片）：
 * 桌面模式且初始化向导未完成时自动弹出 OnboardingWizard——
 * 欢迎（含 AI 同事说明）→ 工作目录 → 创建项目 → 连接仓库 → 配置 AI → 完成，
 * 除登录外全部可跳过。完成标记由 zustand persist + 壳侧镜像双重持久化
 * （动态端口漂移换 origin 后不重弹）。Web 模式不渲染。
 */
import { useAppStore } from '@/infrastructure/store/app-store';
import { isTauriAvailable } from '@/shared/types/electron-api';
import { OnboardingWizard } from '../pages/onboarding-wizard';

export function OnboardingGate() {
  const onboardingCompleted = useAppStore((state) => state.onboardingCompleted);

  if (!isTauriAvailable() || onboardingCompleted) {
    return null;
  }

  return <OnboardingWizard />;
}
