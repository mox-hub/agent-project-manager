import { cn } from '@/lib/utils';

interface ProfileCompletenessRingProps {
  filled: number;
  total: number;
  size?: number;
  className?: string;
}

/** 档案完备度环（v2 纪要 §4.2）：填充率 = 生效槽位 / 内置槽位总数 */
export function ProfileCompletenessRing({
  filled,
  total,
  size = 56,
  className,
}: ProfileCompletenessRingProps) {
  const ratio = total > 0 ? filled / total : 0;
  const stroke = 5;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const tone =
    ratio >= 0.8
      ? 'text-accent-green'
      : ratio >= 0.4
        ? 'text-accent-yellow'
        : 'text-accent-orange';

  return (
    <div
      className={cn('relative inline-flex items-center justify-center', className)}
      style={{ width: size, height: size }}
      data-ai-component="profile-completeness"
      data-ai-role="metric"
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          className="stroke-muted"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - ratio)}
          className={cn('transition-all', tone)}
          stroke="currentColor"
        />
      </svg>
      <span className="absolute text-11 font-semibold tabular-nums">
        {filled}/{total}
      </span>
    </div>
  );
}
