import * as React from 'react';
import { cn } from '@/lib/utils';

interface LinearIconProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string;
}

/**
 * Linear 官方品牌图标
 * ref: https://linear.app
 *
 * 品牌色一律走 `--color-brand-linear` token（批 6b C3：原为内联品牌 hex 字面量）。
 * 用 CSS 类而非 `fill` 表现属性着色：`fill-*` 工具类写的是 CSS 属性，
 * 需要覆写时传 `[&_path]:fill-*` 即可，行为与改造前（硬编码 fill）一致。
 */
export const LinearIcon = React.forwardRef<SVGSVGElement, LinearIconProps>(
  ({ className, size = 24, ...props }, ref) => {
    return (
      <svg
        ref={ref}
        viewBox="0 0 24 24"
        width={size}
        height={size}
        xmlns="http://www.w3.org/2000/svg"
        className={cn('inline-block', className)}
        aria-label="Linear"
        role="img"
        {...props}
      >
        <path
          d="M2.886 4.18A11.982 11.982 0 0 1 11.99 0C18.624 0 24 5.376 24 12.009c0 3.64-1.62 6.903-4.18 9.105L2.887 4.18ZM1.817 5.626l16.556 16.556c-.524.33-1.075.62-1.65.866L.951 7.277c.247-.575.537-1.126.866-1.65ZM.322 9.163l14.515 14.515c-.71.172-1.443.282-2.195.322L0 11.358a12 12 0 0 1 .322-2.195Zm-.17 4.862 9.823 9.824a12.02 12.02 0 0 1-9.824-9.824Z"
          className="fill-brand-linear"
        />
      </svg>
    );
  },
);
LinearIcon.displayName = 'LinearIcon';
