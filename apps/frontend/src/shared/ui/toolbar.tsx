import type { ReactNode } from 'react';
import { colors, spacing, typography } from '../theme/tokens';

export interface ToolbarProps {
  left?: ReactNode;
  right?: ReactNode;
}

export function Toolbar({ left, right }: ToolbarProps) {
  return (
    <section
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: `${spacing.sm}px ${spacing.sm + 2}px ${spacing.sm + 2}px`,
        borderBottom: `1px solid ${colors.borderSubtle}`,
        gap: spacing.md,
        flexWrap: 'wrap',
      }}
    >
      <div>{left}</div>
      <div
        style={{
          flex: 1,
          minWidth: 260,
          display: 'flex',
          justifyContent: 'flex-end',
        }}
      >
        {right}
      </div>
    </section>
  );
}

export interface FilterToolbarProps {
  label?: string;
  children: ReactNode;
}

export function FilterToolbar({ label = 'Filter', children }: FilterToolbarProps) {
  return (
    <Toolbar
      left={
        <div
          style={{
            fontSize: typography.xs,
            color: colors.textMuted,
          }}
        >
          {label}
        </div>
      }
      right={children}
    />
  );
}

