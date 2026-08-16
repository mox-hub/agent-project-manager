import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDesktop } from '@/modules/desktop';

export function DesktopGate({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const { backendStatus, isDesktop } = useDesktop();

  useEffect(() => {
    if (isDesktop && !backendStatus?.running) {
      navigate('/desktop/init', { replace: true });
    }
  }, [isDesktop, backendStatus, navigate]);

  if (isDesktop && !backendStatus?.running) {
    return null;
  }

  return <>{children}</>;
}
