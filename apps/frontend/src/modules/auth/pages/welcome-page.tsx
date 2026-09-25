import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { AuthShell } from '../components/auth-shell';
import { MemberCard } from '../components/member-card';
import { useAuth } from '../hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/brand/logo';

interface WelcomeLocationState {
  /** 注册流携带的注册时间（ISO）；直访欢迎页无此值，Time 行隐藏 */
  registeredAt?: string;
}

/**
 * 注册成功欢迎页（CAP-A-22）：左侧祝贺文案 + 右侧身份工牌。
 * 数据优先注册流 location.state，缺失回退 /auth/me（AuthGuard 已保证
 * 已登录）；注册即登录，本人视角不脱敏（裁决 D6）。
 */
export function WelcomePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useAuth();

  const state = (location.state ?? null) as WelcomeLocationState | null;
  const displayName = currentUser?.displayName || t('auth.badgePlaceholderName');
  const memberNo = (currentUser?.id ?? '').slice(-8).toUpperCase();

  return (
    <AuthShell
      header={<Logo size="lg" variant="framed" ariaLabel="Agent Project Manager" />}
      visual={
        <div className="absolute inset-0 flex items-center justify-center p-8">
          <MemberCard displayName={displayName} memberNo={memberNo} joinedAt={state?.registeredAt} />
        </div>
      }
      footer={
        <>
          <Link
            to="/app/help"
            className="text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            {t('auth.learnMore')}
          </Link>
          <Button size="sm" className="w-28" onClick={() => navigate('/app')}>
            {t('auth.getStarted')}
          </Button>
        </>
      }
    >
      <h1 className="whitespace-pre-line text-2xl font-semibold leading-snug text-foreground">
        {t('auth.journeyTitle')}
      </h1>
      <p className="mt-4 text-sm text-muted-foreground">{t('auth.journeyCongrats')}</p>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t('auth.journeyBody')}</p>
    </AuthShell>
  );
}
