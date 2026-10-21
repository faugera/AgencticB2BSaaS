# Enterprise AI OS — Design contract

Status: proposed shared design direction. Implement incrementally when building real UI; no visual redesign in this documentation PR.

## Principles
Premium, minimal, functional UI inspired by Linear and Pigment. Low cognitive load; one clear primary action per context. Prefer whitespace, hierarchy and progressive disclosure over explanatory paragraphs or decorative icons. Feature documentation belongs in the documentation space, not persistent page chrome.

## Foundations
- React 19, Vite, Tailwind CSS v4; reuse existing UI first.
- Consistent spacing, typography, density, focus rings, radius, surface/elevation and semantic tokens. Light and dark modes.
- Workspace identity: a restrained pastel gradient fading from the top of the workspace page background; configurable per workspace. It must not tint critical status indicators, buttons or data charts.
- Platform administration uses neutral backgrounds.
- WCAG 2.2 AA target: keyboard, contrast, visible focus, reduced motion and responsive layout.

## Responsive behavior (required)
- Mobile-first layouts across phone, tablet and desktop. Navigation collapses gracefully; key actions remain discoverable and keyboard/touch accessible.
- Dense tables use appropriate responsive alternatives (prioritized columns, detail drill-down or horizontal scroll within the table region), never overflow the entire page.
- Charts, dialogs, filters, tooltips and forms adapt to narrow viewports. No hover-only interaction. Verify representative viewport widths and landscape where relevant.

## Internationalization (required)
- French (`fr`) is the default UI language; English (`en`) is available from the first functional release.
- Provide a discoverable language switcher, ideally in user preferences. Preserve the selection and update the document language.
- Every visible string and accessible label uses translation keys, including errors, tooltips, validation, empty states, notifications and dialogs. Avoid text embedded in images.
- Use locale-aware `Intl` formatting for dates, numbers, money and pluralization. Design flexible labels and buttons for longer translations. Avoid fixed widths that truncate meaningful text.
- Test both languages on desktop and mobile, including fallback when a translation is missing.

## Reusable primitives, when justified
Button, Input, Select, Tooltip, Dialog, PageHeader, Breadcrumb, FilterBar, DataTable, Chart and status feedback. Do not scaffold unused components. Domain-specific components live near domain modules. Use contextual tooltips for important unfamiliar actions, with accessible labels.

## Interaction
Compact navigation, meaningful empty/loading/error states, clear permissions feedback, confirm destructive actions. Keep important data visible; hide complexity behind drill-down and tooltips. Avoid icon-only actions without accessible names.

## Quality checks
Responsive desktop/mobile, no overflow, keyboard navigation, contrast and visual consistency. E2E test critical workflows as they become real.
