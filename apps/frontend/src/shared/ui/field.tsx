import type { InputHTMLAttributes, SelectHTMLAttributes, ReactNode } from 'react';
import { colors, radii, spacing, typography, shadows } from '../theme/tokens';

export type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
};

export function Input({ leftIcon, rightIcon, style, ...props }: InputProps) {
  return (
    <div
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        width: '100%',
      }}
    >
      {leftIcon && (
        <span
          style={{
            position: 'absolute',
            left: spacing.md,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 16,
            height: 16,
            color: colors.textMuted,
            pointerEvents: 'none',
            zIndex: 1,
          }}
        >
          {leftIcon}
        </span>
      )}
      <input
        {...props}
        style={{
          width: '100%',
          padding: `${spacing.sm + 2}px ${rightIcon ? spacing.xl + 20 : spacing.lg}px ${spacing.sm + 2}px ${leftIcon ? spacing.xl + 20 : spacing.lg}px`,
          borderRadius: radii.md,
          border: `1px solid ${colors.borderStrong}`,
          backgroundColor: colors.surface,
          color: colors.textPrimary,
          fontSize: typography.sm,
          minWidth: 0,
          transition: 'all 0.2s ease',
          outline: 'none',
          boxShadow: shadows.sm,
          ...style,
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = colors.accent;
          e.currentTarget.style.boxShadow = `0 0 0 3px ${colors.accent}20`;
          props.onFocus?.(e);
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = colors.borderStrong;
          e.currentTarget.style.boxShadow = shadows.sm;
          props.onBlur?.(e);
        }}
      />
      {rightIcon && (
        <span
          style={{
            position: 'absolute',
            right: spacing.md,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 16,
            height: 16,
            color: colors.textMuted,
            pointerEvents: 'none',
            zIndex: 1,
          }}
        >
          {rightIcon}
        </span>
      )}
    </div>
  );
}

export type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  leftIcon?: ReactNode;
};

export function Select({ leftIcon, style, ...props }: SelectProps) {
  return (
    <div
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        width: '100%',
      }}
    >
      {leftIcon && (
        <span
          style={{
            position: 'absolute',
            left: spacing.md,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 16,
            height: 16,
            color: colors.textMuted,
            pointerEvents: 'none',
            zIndex: 1,
          }}
        >
          {leftIcon}
        </span>
      )}
      <select
        {...props}
        style={{
          width: '100%',
          padding: `${spacing.sm + 2}px ${spacing.xl + 20}px ${spacing.sm + 2}px ${leftIcon ? spacing.xl + 20 : spacing.lg}px`,
          borderRadius: radii.md,
          border: `1px solid ${colors.borderStrong}`,
          backgroundColor: colors.surface,
          color: colors.textPrimary,
          fontSize: typography.sm,
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          outline: 'none',
          boxShadow: shadows.sm,
          appearance: 'none',
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%239ca3af' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'no-repeat',
          backgroundPosition: `right ${spacing.md}px center`,
          ...style,
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = colors.accent;
          e.currentTarget.style.boxShadow = `0 0 0 3px ${colors.accent}20`;
          props.onFocus?.(e);
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = colors.borderStrong;
          e.currentTarget.style.boxShadow = shadows.sm;
          props.onBlur?.(e);
        }}
      />
    </div>
  );
}

// Keep PillInput and PillSelect for backward compatibility
export type PillInputProps = InputProps;
export const PillInput = Input;
export type PillSelectProps = SelectProps;
export const PillSelect = Select;
