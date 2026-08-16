/**
 * Design Token Rules
 *
 * All UI code MUST follow these rules. No exceptions.
 * This file is documentation-only; it does not run at runtime.
 *
 * ── Spacing ────────────────────────────────────────────────────────────
 * Use Tailwind's standard scale only:  1(4px)  2(8px)  3(12px)  4(16px)
 *                                      5(20px)  6(24px)  8(32px)
 * FORBIDDEN: p-2.5, px-[11px], py-[3px], any arbitrary pixel value.
 *
 * ── Font sizes ─────────────────────────────────────────────────────────
 * text-xs   (12px) — labels, badges, metadata
 * text-sm   (14px) — body text, form fields
 * text-base (16px) — section headings
 * text-lg   (18px) — page titles (via PageHeader)
 * text-xl   (20px) — large titles (rare)
 * FORBIDDEN: text-[10px], text-[11px], text-[22px].
 *
 * ── Border radius ──────────────────────────────────────────────────────
 * rounded-md   → var(--radius-control) — buttons, inputs, small containers
 * rounded-lg   → var(--radius)         — panels, dialogs, compact cards
 * rounded-xl   → var(--radius) + 4px   — cards (refer design v23)
 * rounded-full → 999px                 — pills, chips, avatars, circles
 * FORBIDDEN: rounded-[8px], rounded-[var(--radius)].
 *
 * ── Colors ─────────────────────────────────────────────────────────────
 * Accent tokens (use these for ALL colored UI):
 *   bg-accent-blue   bg-accent-green   bg-accent-yellow
 *   bg-accent-red    bg-accent-purple
 *   Light variants:   bg-accent-*-light
 *
 * Status tokens:
 *   text-accent-green → on-track/success
 *   text-accent-yellow → warning/at-risk
 *   text-accent-red   → error/off-track
 *   text-accent-purple → AI-related
 *
 * FORBIDDEN: bg-emerald-500, text-violet-500, bg-blue-500, bg-amber-500,
 *            bg-red-500, text-sky-500, text-rose-500, bg-indigo-500,
 *            bg-zinc-500, and all other raw Tailwind color classes.
 * EXCEPTION: dynamic inline styles (e.g. chart colors, user-defined tag colors).
 *
 * ── Buttons ────────────────────────────────────────────────────────────
 * Always use <Button> from @/components/ui/button — never raw <button>.
 * Size variants:  xs(h-6)  sm(h-8)  default(h-9)  lg(h-10)
 *                 icon-xs  icon-sm  icon  icon-lg
 * FORBIDDEN: manual h-7, h-6 with px-2 text-[10px] overrides.
 *
 * ── Cards ──────────────────────────────────────────────────────────────
 * Use Card/CardHeader/CardContent from @/components/ui/card.
 * CardHeader padding: use p-4, not px-4 pb-2 pt-4.
 * Section spacing: mb-4 (not mb-5).
 */

export const DESIGN_TOKEN_RULES = {
  spacing: {
    allowed: [1, 2, 3, 4, 5, 6, 8],
    forbidden: /p-\d+\.\d|px-\[\d+px\]|py-\[\d+px\]/,
  },
  fontSize: {
    allowed: ['text-xs', 'text-sm', 'text-base', 'text-lg', 'text-xl'],
    forbidden: /text-\[1[01]px\]|text-\[22px\]|text-\[9px\]/,
  },
  borderRadius: {
    allowed: ['rounded-md', 'rounded-lg', 'rounded-xl', 'rounded-full'],
    forbidden: /rounded-\[\d+px\]/,
  },
} as const;
