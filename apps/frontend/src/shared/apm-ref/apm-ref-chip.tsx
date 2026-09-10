'use client';

import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  expandApmRefToPath,
  formatApmRef,
  isApmRef,
  parseApmRef,
  type ApmRefKind,
} from '@apm/shared/apm-ref';
import { cn } from '@/lib/utils';
import { getEntityIcon } from '@/shared/entity-icons/entity-icons';
import { RoutePreviewTrigger } from '@/shared/route-preview/route-preview-trigger';

/**
 * apm:// 内嵌链接 chip（契约与文档知识层 v2 纪要 §13 渲染层）。
 * 文本原样保留 `[标题](apm://...)`，视觉渲染为实体 chip；
 * 点击展开为应用路由——文档 kind 直接透传短号（后端 findOne 兼容短号查询），
 * 其余 kind V1 同样以短号作路径段（后端逐域兼容后自动可用）。
 */

/**
 * 引用 kind → 实体图标，统一取自 entity-icons 注册表（规范 v0）：
 * issue 原为 CircleDot、member 原为单数 User，均收敛到注册表口径
 * （issue=CheckSquare、member=Users）；release 已作为增量实体登记入表。
 */
const KIND_ICON: Record<ApmRefKind, React.ComponentType<{ className?: string }>> = {
  doc: getEntityIcon('document').icon,
  issue: getEntityIcon('issue').icon,
  bug: getEntityIcon('bug').icon,
  member: getEntityIcon('member').icon,
  team: getEntityIcon('team').icon,
  acceptance: getEntityIcon('acceptance').icon,
  release: getEntityIcon('release').icon,
};

const KIND_LABEL: Record<ApmRefKind, string> = {
  doc: '文档',
  issue: '工单',
  bug: 'Bug',
  member: '成员',
  team: '团队',
  acceptance: '验收',
  release: '发版',
};

export interface ApmRefLinkProps
  extends Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> {
  href: string;
  children?: React.ReactNode;
}

export function ApmRefLink({
  href,
  children,
  className,
  ...rest
}: ApmRefLinkProps) {
  const navigate = useNavigate();
  const ref = parseApmRef(href);

  if (!ref) {
    // 非法引用降级为普通链接，绝不静默吞
    return (
      <a href={href} className={className} {...rest}>
        {children}
      </a>
    );
  }

  const Icon = KIND_ICON[ref.kind];
  const handleClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    rest.onClick?.(event);
    const path = expandApmRefToPath(ref, () => ref.shortId);
    if (path) navigate(path);
  };

  // hover 预览卡（v2 纪要 §13：同一 preview card）——path 传 apm:// 引用，
  // resolveRoutePreview 已支持引用入口；预览数据按短号查询（文档域后端已兼容）。
  return (
    <RoutePreviewTrigger path={href} side="top" delay={300}>
      <a
        href={href}
        onClick={handleClick}
        data-apm-ref={formatApmRef(ref)}
        title={`${KIND_LABEL[ref.kind]} · ${ref.projectCode}/${ref.shortId}`}
        className={cn(
          'inline-flex items-center gap-1 rounded-full border border-border/60 bg-muted/40 px-2 py-0.5 text-xs',
          'text-primary no-underline transition-colors align-middle hover:bg-primary/10',
          className,
        )}
        {...rest}
      >
        <Icon className="h-3 w-3 shrink-0" />
        <span>{children ?? `${ref.projectCode}/${ref.shortId}`}</span>
      </a>
    </RoutePreviewTrigger>
  );
}

/**
 * react-markdown/MDX components 的 `a` 拦截：apm:// 引用渲染为 chip，
 * 其余链接保持原生行为。
 */
export function apmRefAnchorInterceptor(
  props: React.AnchorHTMLAttributes<HTMLAnchorElement>,
) {
  const { href, ...rest } = props;
  if (href && isApmRef(href)) {
    return <ApmRefLink href={href} {...rest} />;
  }
  return <a href={href} {...rest} />;
}
