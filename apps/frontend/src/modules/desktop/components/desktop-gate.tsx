import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDesktop } from '@/modules/desktop';

/**
 * 桌面模式引导闸：服务未就绪时切到初始化页；就绪后挂 apm:// 深链消费
 * （ADR-015 P2）——apm://<内部路径> 直达页面，仅放行站内路径。
 */
export function DesktopGate({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const { backendStatus, isDesktop } = useDesktop();

  useEffect(() => {
    if (isDesktop && !backendStatus?.running) {
      navigate('/desktop/init', { replace: true });
    }
  }, [isDesktop, backendStatus, navigate]);

  useEffect(() => {
    if (!isDesktop) {
      return undefined;
    }
    const off = window.__TAURI__?.core.onDeepLink?.((url) => {
      // apm://issues/42 → /issues/42；拒绝协议相对（//host）与非法形态
      const target = `/${url.replace(/^apm:\/\//, '')}`;
      if (!target.startsWith('//') && target.length > 1) {
        navigate(target);
      }
    });
    return () => off?.();
  }, [isDesktop, navigate]);

  if (isDesktop && !backendStatus?.running) {
    return null;
  }

  return <>{children}</>;
}
