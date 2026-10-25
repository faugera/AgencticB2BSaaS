# CSS normalization visual review

- **recommendation:** APPROVE
- **verdict:** PASS
- **scope:** Read-only visual review of the targeted CSS normalization and the complete regression capture set against the current `DESIGN_UI.md` Brume charter.

## Evidence checked

- `.omo/css-normalization-browser.log`: 36/36 passed across Chromium, Firefox, and WebKit; FR/EN, light/dark, 375/768/1280.
- `.omo/css-normalization-captures`: 216/216 final viewport PNGs inventoried and inspected, all valid PNG signatures at exactly 375x1024, 768x1024, or 1280x1024. The set includes `gallery-bottom.png` after scrolling the final gallery panel into view.
- `.omo/css-regression.log`: complete browser suite 132/132 passed.
- `.omo/css-regression-captures`: 424/424 PNGs inventoried, valid PNG signatures, and newer than the latest rendered source.
- All 640 available captures were inspected through complete contact sheets: the final 216 viewport captures plus the 424 full-suite regression captures. Targeted originals were then opened at original detail for FR/EN, light/dark, mobile/tablet/desktop and cross-engine states covering authentication error/focus, gallery top/error and scrolled bottom, invitation validation/filter flow, long member data, and long profile/session data.
- Source checks: `apps/web/src/main.tsx`, `apps/web/src/ui/tokens.css`, `apps/web/src/ui/components.css`, `apps/web/src/ui/shell.css`, `apps/web/src/ui/primitives.tsx`, `apps/web/src/pages/InvitationManagement.tsx`, and `apps/web/package.json`.

## User outcome review

The refreshed surfaces retain the Brume hierarchy, open sections, neutral surfaces, restrained purple links, charcoal actions, compact tables, and responsive shell specified by the current charter. Lato 400/700 is locally packaged and imported, and the rendered typography is consistent across the three engines.

Long French and English labels, email addresses, member rows, roles, session identifiers, and error messages remain readable. They wrap within their local region without page-level horizontal overflow or visible glyph clipping. Mobile tables keep their content within the intended local presentation, bottom navigation stays inside the viewport, and tablet/desktop layouts preserve the sidebar/content split.

The targeted normalization behaves visibly as intended: field errors remain attached and colored consistently; filter fields wrap and align without collision; native validation bubbles and the native `details` disclosure marker remain present; contextual links are underlined; focus outlines remain visible; the application brand has stable leading. Dark-mode contrast and accented French glyphs are intact in Chromium, Firefox, and WebKit captures.

The older full-suite gallery screenshots used `fullPage` around a fixed-height independently scrolling shell, which produced a uniform tinted or beige extension below the 1024px shell in some Chromium/DPR variants. Direct inspection showed that extension was background rather than a missing/black compositor region, but those images alone were insufficient evidence for the end of the nested scroll region. The final targeted set uses `fullPage: false` and an explicit scrolled `gallery-bottom` viewport in every engine/locale/theme/width combination; these 216 captures supersede the older full-page gallery images for capture hygiene and show the complete lower content without clipping.

## Blockers

None.

## Direct slop and maintenance review

No screenshot-as-product substitution, decorative icon drift, fake notification affordance, redundant visual abstraction, or test-only production styling was observed. The targeted browser matrix distinguishes engines, locales, themes, widths, error/focus states, and long-content behavior; it is behavioral coverage rather than tautological or deletion-only checking.

## Limits

- This is a visual/source verdict. It does not establish exhaustive WCAG 2.2 AA conformance.
- Some retained full-suite regression artifacts contain the documented full-page extension below the fixed shell; they support behavioral regression coverage, while the final 216 viewport captures are authoritative for visual composition and scroll-end coverage.
- Browser simulation and screenshots do not prove PostgreSQL isolation, RBAC enforcement, or other backend runtime behavior.
- No backend database/runtime claim is made by this report.
