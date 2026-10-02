/**
 * SectionScrubber - 设置页栏目跳转条（section chips，2026-10-01 设置页语义组件批）
 *
 * 声明式 sections（锚点 id + 标签）渲染胶囊 chips：点击平滑滚动到对应
 * SettingsSectionCard（scrollIntoView + 卡片 scroll-mt-24 避让吸顶卡），
 * IntersectionObserver 监听栏目进出视口上部激活带（rootMargin 上 -20% 下 -60%）
 * 驱动当前项高亮（§21 observer 密度：每页一个 observer，非逐行）。
 * 命名注意：与 modules/document 的 chapter-scrubber（阅读页右缘刻度轨+指针放大波，
 * motion spring 形态）是不同组件——section（页面栏目 chips）≠ chapter（文档章节轨），
 * 2026-10-01 撞名裁决改名 section-scrubber 为后者保留 chapter-scrubber 名。
 * 形态裁决（2026-10-01）：主落点是 SettingsHeader 吸顶卡 scrubber 槽，仅吸顶态
 * 出现——sticky 空间零浪费；独立常驻条/右侧竖点形态留作长页（>5 栏目）升级项。
 * 目标锚点缺失时点击为 no-op（消费方保证 sections 与页面锚点一致）。
 * props 面封闭（G8）：不接 className、不透传样式。
 */
import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { RawButton } from '@/components/raw/raw-button';
import { cn } from '@/lib/utils';

export interface ScrubberSection {
  /** 目标锚点 id（= SettingsSectionCard 的 id prop） */
  id: string;
  label: ReactNode;
}

export interface SectionScrubberProps {
  /** 栏目清单（声明顺序即展示顺序）；建议模块级常量，避免每次渲染重建 observer */
  sections: ScrubberSection[];
}

export function SectionScrubber({ sections }: SectionScrubberProps) {
  const { t } = useTranslation();
  const [activeId, setActiveId] = useState(sections[0]?.id);
  const visibleRef = useRef(new Set<string>());

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined' || sections.length === 0) return;
    visibleRef.current = new Set();
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const id = (entry.target as HTMLElement).id;
          if (entry.isIntersecting) visibleRef.current.add(id);
          else visibleRef.current.delete(id);
        }
        const next = sections.find((section) => visibleRef.current.has(section.id));
        if (next) setActiveId((prev) => (prev === next.id ? prev : next.id));
      },
      { rootMargin: '-20% 0px -60% 0px' },
    );
    for (const section of sections) {
      const el = document.getElementById(section.id);
      if (el) io.observe(el);
    }
    return () => io.disconnect();
  }, [sections]);

  return (
    <nav
      aria-label={t('settings.sectionNav')}
      data-slot="section-scrubber"
      className="flex min-w-0 items-center gap-1 overflow-x-auto"
    >
      {sections.map((section) => {
        const active = section.id === activeId;
        return (
          <RawButton
            key={section.id}
            onClick={() => {
              setActiveId(section.id);
              document
                .getElementById(section.id)
                ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }}
            aria-current={active ? 'true' : undefined}
            className={cn(
              'shrink-0 rounded-full px-2.5 py-1 text-xs transition-colors duration-fast',
              active
                ? 'bg-muted font-medium text-foreground'
                : 'text-content-text-muted hover:bg-muted/60 hover:text-content-text-secondary',
            )}
          >
            {section.label}
          </RawButton>
        );
      })}
    </nav>
  );
}
