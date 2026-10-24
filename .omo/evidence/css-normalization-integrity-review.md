# CSS normalization integrity review

- Recommendation: **PASS**
- Review mode: independent read-only visual/source integrity review
- Scope: targeted CSS normalization and Lato typography change only

## User intent and desired outcome

Apply the updated `DESIGN_UI.md` contract without changing product behavior: use self-hosted Lato 400/700, correct field-error specificity, make filter fields flex safely, restore the native `details` marker, underline contextual links, normalize brand leading, and remove duplicate Preflight box-sizing. Preserve the existing Brume system, responsive behavior, accessibility, and prior application/backend work.

## Source review

Checked:

- `DESIGN_UI.md`
- `apps/web/src/ui/tokens.css`
- `apps/web/src/ui/components.css`
- `apps/web/src/ui/shell.css`
- `apps/web/src/styles.css`
- `apps/web/package.json`
- `pnpm-lock.yaml`
- `tests/e2e/css-normalization.spec.ts`
- `playwright.css.config.ts`

The implementation is surgical and consistent with the updated authority:

- Lato is self-hosted through `@fontsource/lato`; the UI token resolves to Lato with system fallback and uses explicit 400/700 weight tokens.
- Typography sizes, leading, spacing, sidebar geometry, colors, scrollbar behavior, and open Brume surfaces remain token-driven.
- `.ui-field .ui-field-error` has sufficient specificity without a broad override.
- Filter flex behavior targets direct `.ui-field` children and preserves zero minimum inline size.
- `details/summary` retains its native marker and remains keyboard-operable.
- Contextual application/auth links receive visible underlines with a tokenized offset; navigation selection remains distinct.
- The application-specific duplicate universal `box-sizing` rule was removed while the existing Tailwind Preflight remains authoritative.
- No backend, authorization, persistence, route, or business behavior changed in this normalization lot.

No slop or overfit blocker was found. The new browser checks assert observable computed styles and reflow behavior across engines rather than mirroring CSS source text. No unnecessary abstraction, dependency beyond the requested font package, deletion-only test, or synthetic production behavior was introduced.

## Visual and functional evidence

Inspected evidence:

- `.omo/css-normalization-browser.log`: **36 passed** in Chromium, Firefox, and WebKit for FR/EN, light/dark, and 375/768/1280 widths.
- `.omo/css-normalization-captures`: 216 viewport PNGs covering field errors, long profile/session data, long member email, invitation validation, auth error/focus, the bottom of the gallery after scrolling, and the supported combinations above.
- `.omo/css-regression.log`: **132 passed** for the complete browser regression suite.
- `.omo/css-regression-captures`: 424 PNGs covering the existing page families.

Direct capture inspection confirmed:

- Lato renders consistently with readable weight hierarchy in all three engines.
- Error text is visible in light and dark themes and remains associated with the invalid field.
- Long emails and unbroken session/device strings wrap without page-level horizontal overflow.
- Filter controls wrap cleanly at 375px and retain usable widths at tablet/desktop sizes.
- The final gallery panels remain fully composed after scrolling in Chromium, Firefox, and WebKit, including the fixed mobile navigation clearance.
- Native account disclosure markers are visible.
- Contextual links are visibly underlined; buttons and selected navigation remain visually distinct.
- Focus rings, disabled states, native email validation, reduced-motion behavior, and responsive navigation remain intact.
- No pasted raster, screenshot-backed UI, new decorative motion, clipped controls, missing glyphs, or unexpected alpha/background defect was observed.

The earlier full-page regression screenshots can include blank bands outside the bounded application shell because the application uses independent shell/content scrolling. Those bands are a capture-pipeline artifact and were not used as composition evidence. The 132-test regression run remains valid as behavioral evidence; visual composition conclusions use the fresh `fullPage: false` normalization captures, including `gallery-bottom.png`.

## Blockers

None.

## Limits and residual risk

- This review does not claim a full WCAG 2.2 AA audit; it verifies the targeted accessibility regressions and the supplied keyboard/focus evidence.
- API/database integration and migrations were outside this CSS-only lot and were not re-certified here.
- Screenshot evidence uses mocked browser API fixtures for deterministic presentation; it proves rendering and UI behavior, not backend authorization.
