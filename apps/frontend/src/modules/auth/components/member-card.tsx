import { useTranslation } from 'react-i18next';

import { Logo } from '@/components/brand/logo';
import { cn } from '@/lib/utils';

interface MemberCardProps {
  /** 成员显示名（同时用作签名） */
  displayName: string;
  /** 成员编号（调用方派生，如 user id 尾 8 位大写） */
  memberNo: string;
  /** 入职时间 ISO 串；缺省隐藏 Time 行（直访欢迎页拿不到注册时间） */
  joinedAt?: string;
  className?: string;
}

/** YYYY/MM/DD（参考身份卡 Time 行格式） */
function formatJoinDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())}`;
}

/**
 * APM 身份工牌（欢迎页右栏）：浅底斜纹卡 + SVG 环形口号
 * 「AGENT PROJECT MANAGER · PEOPLE + AI COLLEAGUES」绕品牌 logo，
 * 下承显示名 / 成员编号 / 入职日期 / 手写体签名。
 * 纯展示仪式件（CAP-A-22 裁决 D2：下载/复制/分享进候补）；
 * 环形文字与编号为纯 Latin（text-11 档豁免见宪法 §2.4）。
 */
export function MemberCard({ displayName, memberNo, joinedAt, className }: MemberCardProps) {
  const { t } = useTranslation();
  const joinDate = joinedAt ? formatJoinDate(joinedAt) : '';

  return (
    <div
      className={cn(
        'bg-card relative w-84 overflow-hidden rounded-xl border border-border shadow-md',
        className,
      )}
    >
      {/* 斜纹纹理：currentColor 走 border token */}
      <svg aria-hidden="true" className="absolute inset-0 h-full w-full text-border opacity-40">
        <defs>
          <pattern
            id="apm-member-card-stripes"
            width="14"
            height="14"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(45)"
          >
            <line x1="0" y1="0" x2="0" y2="14" stroke="currentColor" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#apm-member-card-stripes)" className="opacity-30" />
      </svg>

      <div className="relative flex flex-col px-8 pb-7 pt-9">
        {/* 环形口号徽章 + 中心 logo */}
        <div className="relative mx-auto size-40">
          <svg viewBox="0 0 160 160" className="fill-current h-full w-full text-muted-foreground">
            <defs>
              <path
                id="apm-member-card-circle"
                d="M 80,80 m -60,0 a 60,60 0 1,1 120,0 a 60,60 0 1,1 -120,0"
              />
            </defs>
            <text fontSize="10.5" letterSpacing="1" fontFamily="var(--font-mono)">
              <textPath href="#apm-member-card-circle" textLength="376" lengthAdjust="spacingAndGlyphs">
                AGENT PROJECT MANAGER · PEOPLE + AI COLLEAGUES ·
              </textPath>
            </text>
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <Logo size="lg" variant="plain" />
          </div>
        </div>

        {/* 信息区 */}
        <div className="mt-7 w-full space-y-1.5 border-t border-border pt-5">
          <div className="truncate text-xl font-semibold text-foreground">{displayName}</div>
          <div className="flex items-center justify-between">
            <span className="font-mono text-11 tracking-wide text-muted-foreground">
              {t('auth.badgeNoLabel')} {memberNo}
            </span>
            {joinDate && (
              <span className="font-mono text-11 text-muted-foreground">
                {t('auth.badgeTimeLabel')} {joinDate}
              </span>
            )}
          </div>
          <div className="pt-2 text-right text-sm italic text-muted-foreground">{displayName}</div>
        </div>
      </div>
    </div>
  );
}
