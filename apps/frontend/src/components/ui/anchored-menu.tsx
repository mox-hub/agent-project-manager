import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { MENU_SURFACE_CLASS } from "./menu-surface";

interface AnchoredMenuProps {
  open: boolean;
  onClose: () => void;
  /** 触发元素 ref，面板锚定其下方（视口不足时向上翻转） */
  anchor: RefObject<HTMLElement | null>;
  /** 面板右缘/左缘对齐触发元素，默认 end */
  align?: "start" | "end";
  children: ReactNode;
  className?: string;
}

const VIEWPORT_MARGIN = 8;
const ANCHOR_GAP = 6;

/**
 * 锚定下拉基元：portal 到 body + fixed 定位 + 上下视口翻转 + overlay/ESC 关闭。
 * 供 ToolbarRow 的按钮菜单、视图编辑等下拉复用，避免被工具栏 overflow 裁剪。
 */
export function AnchoredMenu({ open, onClose, anchor, align = "end", children, className }: AnchoredMenuProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [style, setStyle] = useState<CSSProperties | undefined>(undefined);

  useLayoutEffect(() => {
    if (!open) return;

    let raf = 0;
    const startedAt = performance.now();

    const place = () => {
      const trigger = anchor.current;
      const panel = panelRef.current;
      if (!trigger || !panel) return;

      const rect = trigger.getBoundingClientRect();
      const panelWidth = panel.offsetWidth;
      const panelHeight = panel.offsetHeight;
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      let top = rect.bottom + ANCHOR_GAP;
      if (top + panelHeight > viewportHeight - VIEWPORT_MARGIN) {
        top = Math.max(VIEWPORT_MARGIN, rect.top - panelHeight - ANCHOR_GAP);
      }
      let left = align === "end" ? rect.right - panelWidth : rect.left;
      left = Math.min(Math.max(VIEWPORT_MARGIN, left), Math.max(VIEWPORT_MARGIN, viewportWidth - panelWidth - VIEWPORT_MARGIN));

      setStyle({ position: "fixed", top, left });
    };

    // 触发按钮（圆形→胶囊）有宽度过渡动画，展开期间持续重定位保证对齐
    const track = () => {
      place();
      if (performance.now() - startedAt < 450) {
        raf = requestAnimationFrame(track);
      }
    };
    track();

    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, align, anchor]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} aria-hidden="true" />
      <div
        ref={panelRef}
        role="menu"
        style={style}
        className={cn(MENU_SURFACE_CLASS, "z-50 p-1", className)}
      >
        {children}
      </div>
    </>,
    document.body,
  );
}
