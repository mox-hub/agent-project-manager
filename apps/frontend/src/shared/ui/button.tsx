import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { colors, radii, spacing, typography } from '../theme/tokens';

export type PillButtonVariant = 'primary' | 'secondary' | 'ghost';
export type PillButtonSize = 'sm' | 'md';

export interface PillButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: PillButtonVariant;
  size?: PillButtonSize;
  leftIcon?: ReactNode;
}

export function PillButton({
  variant = 'primary',
  size = 'md',
  leftIcon,
  style,
  disabled,
  ...props
}: PillButtonProps) {
  const heightPadding =
    size === 'sm'
      ? { padding: `${spacing.xs}px ${spacing.lg}px` }
      : { padding: `${spacing.sm}px ${spacing.xl}px` };

  let variantStyle: React.CSSProperties;

  if (variant === 'primary') {
    variantStyle = {
      border: 'none',
      background: `linear-gradient(135deg, ${colors.accent}, ${colors.accent} 40%, ${colors.accentAlt} 100%)`,
      color: '#020617',
      fontWeight: 600,
    };
  } else if (variant === 'secondary') {
    variantStyle = {
      border: `1px solid ${colors.borderStrong}`,
      backgroundColor: colors.background,
      color: colors.textPrimary,
      fontWeight: 500,
    };
  } else {
    variantStyle = {
      border: 'none',
      background: 'transparent',
      color: colors.textSecondary,
      fontWeight: 400,
    };
  }

  return (
    <button
      type="button"
      {...props}
      disabled={disabled}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        borderRadius: radii.pill,
        fontSize: typography.sm,
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.7 : 1,
        ...heightPadding,
        ...variantStyle,
        ...style,
      }}
    >
      {leftIcon && (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {leftIcon}
        </span>
      )}
      {props.children}
    </button>
  );
}

