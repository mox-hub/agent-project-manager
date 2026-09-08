'use client';

import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bug,
  CircleDot,
  FileText,
  ShieldCheck,
  Tag,
  User,
  Users,
} from 'lucide-react';
import {
  expandApmRefToPath,
  formatApmRef,
  isApmRef,
  parseApmRef,
  type ApmRefKind,
} from '@apm/shared/apm-ref';
import { cn } from '@/lib/utils';

/**
 * apm:// 内嵌链接 chip（契约与文档知识层 v2 纪要 §13 渲染层）。
 * 文本原样保留 `[标题](apm://...)`，视觉渲染为实体 chip；
 * 点击展开为应用路由——文档 kind 直接透传短号（后端 findOne 兼容短号查询），
 * 其余 kind V1 同样以短号作路径段（后端逐域兼容后自动可用）。
 */

const KIND_ICON: Record<ApmRefKind, React.ComponentType<{ className?: string }>> = {
  doc: FileText,
  issue: CircleDot,
  bug: Bug,
  member: User,
  team: Users,
  acceptance: ShieldCheck,
  release: Tag,
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

  return (
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
