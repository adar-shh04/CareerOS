# CareerOS Design System & App Shell Specification
### Built on the approved direction: "The Instrument," with document-serif and spacious-panel borrowings

This spec translates the approved direction into implementable tokens, components, and shell measurements. Values are specified as tokens throughout — reference the token name in code, not the raw value, so the palette or scale can shift centrally later.

---

## 1. Design Tokens

### 1.1 Color

| Token | Value | Usage |
|---|---|---|
| `color-bg-canvas` | `#F7F7F5` | App background, page canvas |
| `color-bg-surface` | `#FFFFFF` | Raised surfaces: panels, popovers, the sidebar |
| `color-bg-sunken` | `#EFEFED` | Sunken/inset areas: input fields, code/data blocks |
| `color-bg-hover` | `#ECECE9` | Row/item hover background |
| `color-bg-selected` | `#E8EDF1` | Active nav item, selected row (tinted with accent) |
| `color-border-default` | `#E2E2DF` | Default hairline border |
| `color-border-strong` | `#CBCBC7` | Emphasized dividers (table headers, panel edges) |
| `color-text-primary` | `#1C1D1F` | Primary text, headings |
| `color-text-secondary` | `#5B5C5F` | Secondary text, metadata, timestamps |
| `color-text-tertiary` | `#8A8B8D` | Placeholder text, disabled labels |
| `color-text-inverse` | `#F7F7F5` | Text on filled/dark surfaces |
| `color-accent` | `#3E5C76` | Primary actions, links, active states, focus ring |
| `color-accent-hover` | `#334A5F` | Accent hover/pressed |
| `color-accent-subtle` | `#E8EDF1` | Accent background tint (selected states, subtle highlight) |
| `color-success` | `#4C7A62` | Matched skills, positive fit signal, confirmations |
| `color-success-subtle` | `#E6EEEA` | Success background tint |
| `color-warning` | `#B8863B` | Skill gaps, attention-needed states |
| `color-warning-subtle` | `#F5EEE1` | Warning background tint |
| `color-danger` | `#A6543D` | Blockers, destructive actions, errors |
| `color-danger-subtle` | `#F4E7E2` | Danger background tint |
| `color-focus-ring` | `#3E5C76` at 40% opacity | Keyboard focus outline, all interactive elements |

Semantic colors (`success`/`warning`/`danger`) are desaturated versions of their hue family — never full-saturation "alert red" or "go green." This is what keeps Fit Score and skill-gap indicators calm rather than alarming.

### 1.2 Typography

**Families**
| Token | Family | Role |
|---|---|---|
| `font-sans` | Interface grotesk (e.g. Söhne/Inter-class) | All UI chrome, nav, tables, buttons, forms |
| `font-serif-document` | A humanist serif (e.g. Tiempos/Charter-class) | Resume Studio document surface, Career Profile "reading" views only |
| `font-mono` | A functional monospace (e.g. Berkeley Mono/JetBrains-class) | Fit Score numerals, ATS scores, dates in tables — data only, never labels |

**Type scale** (base 16px, ~1.2 ratio, tabular numerals enabled on `font-mono`)

| Token | Size / Line-height | Weight | Usage |
|---|---|---|---|
| `text-display` | 32px / 40px | 600 | Page-level identity moments (user name in Profile header) |
| `text-h1` | 24px / 32px | 600 | Page titles |
| `text-h2` | 20px / 28px | 600 | Section headers within a page |
| `text-h3` | 16px / 24px | 600 | Card/panel titles |
| `text-body` | 14px / 22px | 400 | Default UI text |
| `text-body-strong` | 14px / 22px | 500 | Emphasized inline text, table headers |
| `text-caption` | 12px / 18px | 400 | Metadata, timestamps, helper text |
| `text-doc-body` | 17px / 28px | 400, `font-serif-document` | Resume/profile reading content |
| `text-data` | 14px / 20px | 500, `font-mono`, tabular-nums | Scores, percentages, dates in tables |

Line length for `text-doc-body` is capped at 72 characters. No other type treatment (all-caps labels, single-word accent color in headings) is used — see §7.

### 1.3 Spacing

4px base unit.

| Token | Value |
|---|---|
| `space-1` | 4px |
| `space-2` | 8px |
| `space-3` | 12px |
| `space-4` | 16px |
| `space-5` | 24px |
| `space-6` | 32px |
| `space-7` | 48px |
| `space-8` | 64px |

### 1.4 Radius

Flat-leaning system — radius communicates interactivity level, not decoration.

| Token | Value | Usage |
|---|---|---|
| `radius-none` | 0px | Table rows, dividers, document surface |
| `radius-sm` | 4px | Inputs, buttons, chips |
| `radius-md` | 8px | Panels, popovers, modals |
| `radius-full` | 999px | Fit Score badge, avatar, pill-shaped filters |

### 1.5 Border & Elevation

| Token | Value | Usage |
|---|---|---|
| `border-width-default` | 1px solid `color-border-default` | Default component border |
| `border-width-strong` | 1px solid `color-border-strong` | Table header underline, active panel edge |
| `elevation-none` | none | Default state for all inline surfaces (cards, rows) |
| `elevation-overlay` | `0 4px 16px rgba(28,29,31,0.08)` | Reserved exclusively for floating/detached surfaces: command palette, dropdown menus, toasts, modals |

Nothing that sits in the normal document flow gets a shadow. Shadow exists only to signal "this is floating above the page."

### 1.6 Motion

| Token | Value | Usage |
|---|---|---|
| `motion-instant` | 100ms, `ease-out` | Hover states, pressed states |
| `motion-fast` | 160ms, `ease-out` | Dropdown/menu open, tooltip |
| `motion-panel` | 220ms, `cubic-bezier(0.2, 0, 0, 1)` | Contextual AI panel slide-in, sidebar collapse |
| `motion-page` | 140ms, `ease-in-out` | Page-level crossfade on route change |

No entrance animation is applied to static content on load (no fade-up lists, no staggered cards). Motion always answers a specific user action.

---

## 2. Core Components

### 2.1 Button

| Variant | Background | Text | Border | Usage |
|---|---|---|---|---|
| Primary | `color-accent` | `color-text-inverse` | none | One per page/section max |
| Secondary | `color-bg-surface` | `color-text-primary` | `border-width-default` | Standard actions |
| Ghost | transparent | `color-text-primary` | none | Low-emphasis/inline actions |
| Destructive | `color-bg-surface` | `color-danger` | `border-width-default`, `color-danger` | Delete/discard actions |

Height 36px (default), 32px (compact, used in table rows). Padding `space-4` horizontal. Radius `radius-sm`.

### 2.2 Fit Score Badge

Pill (`radius-full`), `font-mono`/`text-data` numeral + label. Background uses the relevant subtle semantic tint based on score band (e.g. ≥75% `color-success-subtle` text `color-success`; 40–74% `color-warning-subtle`; <40% `color-danger-subtle`), never a raw percentage with no visual banding. Always paired with a "Why" affordance (ghost button or info icon) that opens the match explanation — the badge is never shown without a path to its reasoning.

### 2.3 Skill Chip

Small pill, `radius-full`, `text-caption`. Two variants only: **Matched** (`color-success-subtle` bg, `color-success` text) and **Missing** (`color-warning-subtle` bg, `color-warning` text). No neutral/default chip variant in this context — a skill chip's entire purpose is to communicate match status.

### 2.4 Nav Item (sidebar)

Height 36px, full rail width, `radius-sm`, icon (20px) + label (`text-body`). Default: transparent bg, `color-text-secondary` icon/text. Hover: `color-bg-hover`. Active: `color-bg-selected` bg, `color-accent` icon/text, plus a 2px `color-accent` left-edge indicator inside the item (not a full pill fill — keeps the rail visually quiet).

### 2.5 Table Row / List Item

`radius-none`, `border-width-default` as bottom border only (no boxed rows). Row height 44px (48px on touch/mobile). Hover: `color-bg-hover`. Selected: `color-bg-selected`. This is the default pattern for Applications, Job Radar list, and Resume version history — anywhere content is genuinely a list of comparable items.

### 2.6 Card

Reserved for discrete objects only (a single resume version, a career profile section, a saved job). `radius-md`, `border-width-default`, `elevation-none`, `color-bg-surface` background on `color-bg-canvas` page. Padding `space-5`. Cards are never used as a generic content wrapper for arbitrary sections — if content is list-like, it's a table row, not a card.

### 2.7 AI Annotation ("Margin Note")

Inline marker: a small `color-accent` dot or underline-decoration on the annotated text/field, expanding on click/hover into a compact popover (`elevation-overlay`, `radius-md`, max-width 320px) containing: the suggestion, one line of reasoning, and two actions — **Accept** (ghost button, `color-accent`) and **Dismiss** (ghost button, `color-text-secondary`). Never auto-expanded, never modal, never blocking the underlying field.

### 2.8 Document Surface

Used only in Resume Studio (preview/edit) and Career Profile (review view). `color-bg-surface` on `color-bg-canvas`, generous internal padding (`space-7`), `text-doc-body` in `font-serif-document`, max-width matching print-page proportions. Margin Notes are the only AI surface allowed to appear directly on the Document Surface — no side-panel AI chrome overlapping a document view.

### 2.9 Toast

`elevation-overlay`, `radius-md`, bottom-right, auto-dismiss 4s, manually dismissible. Reserved for background/system events only (see interaction principles) — never used for confirming a primary user action, which gets inline feedback instead.

### 2.10 Empty State

No illustration by default. Structure: one line stating what's missing (`text-h3`), one line of context (`text-body`, `color-text-secondary`), one primary button. Illustration may be added later as a design refinement pass, not a placeholder for missing content strategy.

---

## 3. App Shell Visual Specification

### 3.1 Grid & Container

- 12-column grid, `space-5` (24px) gutters on desktop, `space-4` (16px) on tablet/mobile.
- Content container max-width: `1120px` for reading/document-heavy pages (Career Profile, Resume Studio, AI Coach), full-bleed (minus rail/padding) for table-heavy pages (Job Radar, Applications).
- Page-level horizontal padding: `space-6` (32px) desktop, `space-5` (24px) tablet, `space-4` (16px) mobile.

### 3.2 Sidebar

| Property | Expanded | Collapsed (icon rail) |
|---|---|---|
| Width | 240px | 64px |
| Background | `color-bg-surface` | `color-bg-surface` |
| Right border | `border-width-default` | `border-width-default` |
| Section padding | `space-4` top/bottom | `space-3` top/bottom |
| Nav item | icon + label, left-aligned | icon centered, tooltip on hover |
| Workspace switcher | top, height 48px, full-width | top, icon only, 48px |
| Settings + user menu | pinned bottom, `space-4` padding | pinned bottom, icon only |

Collapse toggle lives at the bottom of the rail as a small chevron control. State persists per user (not per session).

### 3.3 Top Bar

- Height: 56px, fixed.
- Background: `color-bg-canvas` (matches page — the top bar should not read as a separate chrome layer from the content).
- Bottom border: `border-width-default`.
- Left: page title (`text-h1`) + optional breadcrumb (`text-caption`, `color-text-secondary`) stacked or inline depending on available width.
- Center-right: command palette trigger — a search-style input affordance, 320px width on desktop, collapses to icon-only below 1024px. Placeholder text: "Search or jump to…".
- Right: notification bell (24px icon, `space-5` from edge), badge dot (`color-accent`, 8px) when unread items exist — no numeric unread counts, which create false urgency for a product that should feel calm.

### 3.4 Workspace Switcher

Dropdown anchored to the sidebar top slot. Shows current workspace name + a subtle "Personal" vs. org-context label. Opens a list (`elevation-overlay`, `radius-md`) with other available workspaces below and "Manage workspaces" pinned at the bottom.

### 3.5 Notifications Panel

Slides down from the bell, anchored top-right, width 360px, max-height 480px with internal scroll, `elevation-overlay`, `radius-md`. Grouped by category with a small header per group (`text-caption`, `color-text-secondary`, sentence case — not tracked-out caps). Each group has an independent "Mute" affordance in its header.

### 3.6 User Menu

Anchored to the sidebar's bottom avatar slot, opens upward, width 240px, `elevation-overlay`, `radius-md`. Order: account name/email (non-interactive header row), Settings, API Keys (BYOK), divider, Sign out.

### 3.7 Command Palette

Centered overlay, width 560px, max-height 60vh, `elevation-overlay`, `radius-md`, backdrop `color-text-primary` at 4% opacity (barely-there dimming, not a heavy scrim — this should feel like a quick tool, not a modal interruption). Triggered by ⌘K / top-bar search affordance / mobile search icon.

### 3.8 Contextual AI Panel

| Breakpoint | Behavior |
|---|---|
| Desktop (>1024px) | Persistent right-hand panel, 360px width, pushes content column rather than overlaying it, `border-width-default` left edge, `color-bg-surface` background |
| Tablet (640–1024px) | Slide-over from the right, 400px width, overlays content with `elevation-overlay`, dismissible via scrim click or close icon |
| Mobile (<640px) | Bottom sheet, 85vh max-height, drag-to-dismiss handle at top |

Internal padding `space-5`. This is the one panel in the system given slightly more breathing room than the base density — per the approved direction's borrowing from "The Studio Console," the AI Coach and contextual-annotation surfaces should feel spacious relative to the rest of the (denser) shell.

### 3.9 Main Content Area

Single-column by default. Page header pattern (all pages): title row (`space-6` bottom margin) → optional tab row (`border-width-strong` bottom border on the tab strip) → content. Only one primary (filled) button is permitted per page header; secondary actions use the Secondary or Ghost button variants.

---

## 4. Responsive Behavior

| Breakpoint | Range | Shell changes |
|---|---|---|
| Mobile | <640px | Sidebar → bottom tab bar (5 icons: Dashboard, Radar, Resumes, Applications, More). Top bar collapses to title + search icon + bell. AI panel → bottom sheet. Tables → stacked list cards with primary field emphasized. |
| Tablet | 640–1024px | Sidebar → icon rail (64px) by default, expandable on demand. AI panel → slide-over. Command palette trigger collapses to icon. |
| Desktop | 1024–1440px | Full expanded sidebar (240px) default. AI panel persistent, pushes content. |
| Wide | >1440px | Content container caps at max-width per §3.1; extra width becomes additional page margin, not stretched content — tables may use the extra width for additional visible columns. |

---

## 5. States & Interactions

| Element | State | Behavior |
|---|---|---|
| Nav item | Hover | `color-bg-hover`, `motion-instant` |
| Nav item | Active | `color-bg-selected` + left-edge accent indicator |
| Button (primary) | Loading | Label replaced with inline spinner (16px), button width unchanged, disabled pointer events |
| Button | Disabled | 40% opacity, no hover state, `cursor: not-allowed` |
| Table row | Hover | `color-bg-hover` |
| Table row | Loading | Skeleton row matching column widths, shimmer disabled (static tone shift only — shimmer reads as decorative) |
| Fit Score badge | Click | Opens match-explanation popover, `motion-fast` |
| Margin Note | Hover | Underline decoration appears under annotated text |
| Margin Note | Click | Popover opens, `motion-fast`; Accept/Dismiss resolve inline without closing the popover animation abruptly — a brief `motion-instant` confirmation flash before it closes |
| Form field | Error | `color-danger` border, error message below in `text-caption`/`color-danger`, no red field background |
| Toast | Enter/exit | Slide + fade, `motion-fast` |
| Contextual AI panel | Open/close | `motion-panel` |
| Route change | — | `motion-page` crossfade on main content only; sidebar/top bar do not transition |

---

## 6. Accessibility

- All interactive elements use `color-focus-ring` as a visible 2px outline on keyboard focus — never removed, never replaced with a background-only change.
- Minimum touch target 40x40px on mobile/tablet, including collapsed sidebar icons and table row actions.
- Color is never the sole carrier of meaning: Fit Score and Skill Chip states pair color with text/label (e.g., "Matched," "Missing," numeric score), not color alone.
- Focus order in the Contextual AI Panel and Command Palette is trapped while open and returns to the triggering element on close.
- All semantic colors (`success`/`warning`/`danger`) meet WCAG AA contrast against their respective `-subtle` backgrounds and against `color-bg-canvas` for text usage.
- Reduced-motion preference disables `motion-panel` and `motion-page` transitions in favor of instant state changes; `motion-instant` hover feedback remains (it's not a distance-based animation).

---

*Next step: translate §1–2 into an actual token file (CSS variables or Tailwind config) and build the Sidebar, Top Bar, and Contextual AI Panel as the first three shell components, since every other page depends on them.*
