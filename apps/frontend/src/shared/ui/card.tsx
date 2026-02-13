import type { ReactNode } from 'react';
import { colors, radii, spacing, typography } from '../theme/tokens';

export interface CardProps {
  title?: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  maxWidth?: number | string;
}

export function Card({ title, description, children, footer, maxWidth = 520 }: CardProps) {
  return (
    <div
      style={{
        marginTop: spacing.xl,
        padding: spacing.xl,
        borderRadius: radii.md,
        border: `1px solid ${colors.borderStrong}`,
        background: colors.surface,
        maxWidth,
      }}
    >
      {(title || description) && (
        <div style={{ marginBottom: spacing.md }}>
          {title && (
            <h3
              style={{
                marginTop: 0,
                marginBottom: spacing.xs,
                fontSize: typography.md,
                color: colors.textPrimary,
              }}
            >
              {title}
            </h3>
          )}
          {description && (
            <p
              style={{
                marginTop: 0,
                marginBottom: 0,
                fontSize: typography.xs,
                color: colors.textSecondary,
              }}
            >
              {description}
            </p>
          )}
        </div>
      )}

      <div>{children}</div>

      {footer && (
        <div
          style={{
            display: 'flex',
            gap: spacing.md,
            justifyContent: 'flex-end',
            marginTop: spacing.lg,
          }}
        >
          {footer}
        </div>
      )}
    </div>
  );
}

