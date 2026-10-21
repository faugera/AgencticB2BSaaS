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

## Reusable primitives, when justified
Button, Input, Select, Tooltip, Dialog, PageHeader, Breadcrumb, FilterBar, DataTable, Chart and status feedback. Do not scaffold unused components. Domain-specific components live near domain modules. Use contextual tooltips for important unfamiliar actions, with accessible labels.

## Interaction
Compact navigation, meaningful empty/loading/error states, clear permissions feedback, confirm destructive actions. Keep important data visible; hide complexity behind drill-down and tooltips. Avoid icon-only actions without accessible names.

## Quality checks
Responsive desktop/mobile, no overflow, keyboard navigation, contrast and visual consistency. E2E test critical workflows as they become real.
