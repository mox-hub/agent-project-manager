/**
 * Design Token Rules
 *
 * All UI code MUST follow these rules. No exceptions.
 * This file is documentation-only; it does not run at runtime.
 *
 * ── Spacing ────────────────────────────────────────────────────────────
 * Use Tailwind's standard scale only:  1(4px)  2(8px)  3(12px)  4(16px)
 *                                      5(20px)  6(24px)  8(32px)
 * FORBIDDEN: p-2.5, px-2.75, py-0.75, any arbitrary pixel value.
 *
 * ── Font sizes ─────────────────────────────────────────────────────────
 * text-xs   (12px) — labels, badges, metadata
 * text-sm   (14px) — body text, form fields
 * text-base (16px) — section headings
 * text-lg   (18px) — page titles (via PageHeader)
 * text-xl   (20px) — large titles (rare)
 * FORBIDDEN: text-10, text-11, text-22.
 *
 * ── Border radius ──────────────────────────────────────────────────────
 * rounded-md   → var(--radius-control) — buttons, inputs, small containers
 * rounded-lg   → var(--radius)         — panels, dialogs, compact cards
 * rounded-xl   → var(--radius) + 4px   — cards (refer design v23)
 * rounded-full → 999px                 — pills, chips, avatars, circles
 * FORBIDDEN: rounded-8, rounded-lg.
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
 * FORBIDDEN: manual h-7, h-6 with px-2 text-10 overrides.
 *
 * ── Page header ────────────────────────────────────────────────────────
 * PageHeader is a single row (py-2): bare icon (size-5) visually matches
 * the text-lg title, a favorite star and then counter capsules (metrics)
 * follow the title, and the actions group (gap-2) sits on the right.
 * No description / subtitle line — counts belong in metrics.
 * Header actions use <HeaderActionButton> from
 * @/components/ui/header-action-button: h-8 rounded-full, icon-only circle
 * by default, expands to a capsule (icon circle + label) on hover /
 * focus-visible via max-width transition on var(--motion-normal). The
 * expansion is a real width change, so sibling buttons shift naturally.
 * Counter capsule mirrors the integration page StatusBadge at a smaller
 * size: rounded-full border px-2 py-0.5 text-xs, tinted accent-*-light
 * background, tone-colored text and a size-1.5 status dot.
 * FORBIDDEN: regular text <Button> inside PageHeader actions; subtitle
 * text under the page title; custom accent-blue fills on header buttons
 * (use the default primary variant).
 *
 * ── Toolbar row ────────────────────────────────────────────────────────
 * List pages place <ToolbarRow> directly under PageHeader. It has NO
 * top/bottom border (single row, py-2) and NO search input (search lives
 * at the top of the filter dropdown, debounced 300ms).
 * Left: saved-view capsules (h-8 rounded-full; active = bg-primary) with
 * an "+" add button; view snapshots (filters / view style / sort, page-
 * defined shape) are persisted per page via useToolbarViews to
 * localStorage "toolbar-views:<key>"; at least one built-in view exists.
 * Center: view-style switcher when ≤3 styles (SegmentedControl
 * variant="rect": rounded-md track + rounded-sm slider inset-0.5 —
 * compact, near-rectangular); >3 styles collapse into a pinned
 * dropdown button inside the right group (force with viewStyle.layout).
 * Options accept a semantic tone (blue/green/yellow/red/purple) that
 * tints the active slider and label; pages choose tones as needed.
 * Right: button group reusing HeaderActionButton (Filter / Display /
 * Download dropdowns by default; pages pass metadata items, can remove
 * with false, and append extraActions). Menu buttons support a numeric
 * badge (top-right red dot) via ToolbarMenuSlot.badge. Dropdowns render
 * through AnchoredMenu (portal + fixed + viewport flip; re-anchors
 * during the button's expand animation).
 * FORBIDDEN: border-b wrappers around the toolbar; search inputs inside
 * the toolbar row; hand-rolled fixed panels for filter/display menus.
 *
 * ── Sub-page toolbar ───────────────────────────────────────────────────
 * Detail / second-level pages place <SubPageToolbar> above PageHeader.
 * Same three-column grid as ToolbarRow (single row, py-2, no borders).
 * Left: back button (HeaderActionButton ghost + ArrowLeft, history back
 * by default) then breadcrumbs (ChevronRight separators, middle items
 * are Links, last item is foreground + truncate). Center: sub-page tabs
 * via SegmentedControl variant="rect". Right: pager (ghost circle
 * prev/next + tabular-nums position, fed by useEntityNavigation) left
 * of the custom action group; a fixed sidebar-toggle button
 * (PanelRight / PanelRightClose, outline) must be last when the page
 * has a right panel — omit `sidebar` otherwise.
 * FORBIDDEN: hand-written detail-page breadcrumb strips; back buttons
 * inside PageHeader actions (move them into SubPageToolbar).
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
