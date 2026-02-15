import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { colors, radii, spacing, typography, shadows } from '../theme/tokens';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'outline';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

// Keep PillButton types for backward compatibility
export type PillButtonVariant = ButtonVariant;
export type PillButtonSize = ButtonSize;
export interface PillButtonProps extends ButtonProps {}

export function Button({
  variant = 'primary',
  size = 'md',
  leftIcon,
  rightIcon,
  style,
  disabled,
  ...props
}: ButtonProps) {
  const sizeStyles = {
    sm: {
      padding: `${spacing.xs + 2}px ${spacing.md + 4}px`,
      fontSize: typography.xs,
      gap: spacing.xs,
    },
    md: {
      padding: `${spacing.sm + 2}px ${spacing.lg + 4}px`,
      fontSize: typography.sm,
      gap: spacing.sm,
    },
    lg: {
      padding: `${spacing.md + 2}px ${spacing.xl + 4}px`,
      fontSize: typography.md,
      gap: spacing.md,
    },
  };

  const variantStyles: Record<ButtonVariant, React.CSSProperties> = {
    primary: {
      border: 'none',
      background: `linear-gradient(135deg, ${colors.accent}, ${colors.accent} 40%, ${colors.accentAlt} 100%)`,
      color: '#020617',
      fontWeight: 600,
      boxShadow: shadows.sm,
    },
    secondary: {
      border: `1px solid ${colors.borderStrong}`,
      backgroundColor: colors.surface,
      color: colors.textPrimary,
      fontWeight: 500,
      boxShadow: shadows.sm,
    },
    outline: {
      border: `1.5px solid ${colors.borderStrong}`,
      backgroundColor: 'transparent',
      color: colors.textPrimary,
      fontWeight: 500,
    },
    ghost: {
      border: 'none',
      background: 'transparent',
      color: colors.textSecondary,
      fontWeight: 400,
    },
  };

  const baseStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.6 : 1,
    transition: 'all 0.2s ease',
    fontFamily: 'inherit',
    outline: 'none',
    ...sizeStyles[size],
    ...variantStyles[variant],
    ...style,
  };

  return (
    <button
      type="button"
      {...props}
      disabled={disabled}
      style={baseStyle}
      onMouseEnter={(e) => {
        if (!disabled && variant !== 'ghost') {
          e.currentTarget.style.transform = 'translateY(-1px)';
          e.currentTarget.style.boxShadow =
            variant === 'primary' ? shadows.md : shadows.sm;
        }
        props.onMouseEnter?.(e);
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = '';
        e.currentTarget.style.boxShadow = variantStyles[variant].boxShadow || '';
        props.onMouseLeave?.(e);
      }}
      onFocus={(e) => {
        if (!disabled) {
          e.currentTarget.style.outline = `2px solid ${colors.accent}`;
          e.currentTarget.style.outlineOffset = '2px';
        }
        props.onFocus?.(e);
      }}
      onBlur={(e) => {
        e.currentTarget.style.outline = '';
        e.currentTarget.style.outlineOffset = '';
        props.onBlur?.(e);
      }}
    >
      {leftIcon && (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: size === 'sm' ? 14 : size === 'md' ? 16 : 18,
            height: size === 'sm' ? 14 : size === 'md' ? 16 : 18,
          }}
        >
          {leftIcon}
        </span>
      )}
      {props.children}
      {rightIcon && (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: size === 'sm' ? 14 : size === 'md' ? 16 : 18,
            height: size === 'sm' ? 14 : size === 'md' ? 16 : 18,
          }}
        >
          {rightIcon}
        </span>
      )}
    </button>
  );
}

// Export PillButton as alias for backward compatibility
export const PillButton = Button;
