/**
 * 全局实时连接横幅 —— socket 断线/连接失败时顶部常显提示，重连成功自动消失。
 * 兜底改造批 1：此前断线只打 console log，叠加 refetchOnWindowFocus:false
 * 后断线期间页面数据全面陈旧且用户无感。
 */
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { WifiOff } from 'lucide-react';
import { eventClient } from '@/infrastructure/event-client';

export function ConnectionBanner() {
  const { t } = useTranslation();
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const onDown = () => setOffline(true);
    const onUp = () => setOffline(false);
    eventClient.on('disconnected', onDown);
    eventClient.on('error', onDown);
    eventClient.on('connected', onUp);
    return () => {
      eventClient.off('disconnected', onDown);
      eventClient.off('error', onDown);
      eventClient.off('connected', onUp);
    };
  }, []);

  if (!offline) return null;
  return (
    <div
      className="fixed inset-x-0 top-0 z-100 flex h-7 items-center justify-center gap-2 bg-accent-orange text-xs font-medium text-white"
      data-ai-component="shell.connection-banner"
      data-ai-role="status"
    >
      <WifiOff className="size-3.5" />
      {t('shell.connectionLost', '实时连接已断开，正在重试…页面数据可能不是最新')}
    </div>
  );
}
