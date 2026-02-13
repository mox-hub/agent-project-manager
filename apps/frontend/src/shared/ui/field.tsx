import type { InputHTMLAttributes, SelectHTMLAttributes } from 'react';
import { colors, radii, spacing, typography } from '../theme/tokens';

export type PillInputProps = InputHTMLAttributes<HTMLInputElement>;

export function PillInput({ style, ...props }: PillInputProps) {
  return (
    <input
      {...props}
      style={{
        padding: `${spacing.sm}px ${spacing.lg}px`,
        borderRadius: radii.pill,
        border: `1px solid ${colors.borderStrong}`,
        backgroundColor: colors.background,
        color: colors.textPrimary,
        fontSize: typography.xs,
        minWidth: 0,
        ...style,
      }}
    />
  );
}

export type PillSelectProps = SelectHTMLAttributes<HTMLSelectElement>;

export function PillSelect({ style, ...props }: PillSelectProps) {
  return (
    <select
      {...props}
      style={{
        padding: `${spacing.sm}px ${spacing.lg}px`,
        borderRadius: radii.pill,
        border: `1px solid ${colors.borderStrong}`,
        backgroundColor: colors.background,
        color: colors.textPrimary,
        fontSize: typography.xs,
        ...style,
      }}
    />
  );
}

