/**
 * 首启引导门控（CAP-A-14 体验切片；P2-27 起 Web 端同样生效）：
 * 初始化向导未完成时自动弹出 OnboardingWizard——
 * 欢迎 → 工作目录（桌面）→ 环境检查（桌面）→ 创建项目 → 连接仓库 → 配置 AI → 完成。
 * 触发语义（2026-10-03 改版裁决）：**一台机器主动触及一次**——未完成时自动弹一次，
 * 用户关闭（ESC/遮罩/关闭钮）即视为触及已消费（落完成标记），此后永不自动弹，
 * 只能从侧边栏「引导」项手动重开（onboardingOpen 非持久化开关，会话内有效）。
 * 完成标记沿用既有机制：zustand persist（localStorage）持久化；桌面端另镜像到壳侧
 * （desktop-state.json，端口漂移换 origin 后由 restoreDesktopSession 播种回 store）。
 */
import { useAppStore } from '@/infrastructure/store/app-store';
import { OnboardingWizard } from '../pages/onboarding-wizard';

export function OnboardingGate() {
  const onboardingCompleted = useAppStore((state) => state.onboardingCompleted);
  const onboardingOpen = useAppStore((state) => state.onboardingOpen);

  if (onboardingCompleted && !onboardingOpen) {
    return null;
  }

  return <OnboardingWizard />;
}
