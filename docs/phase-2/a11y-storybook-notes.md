# Storybook A11y Audit Notes

Date: 2026-07-01
Branch: `dev2/a11y-storybook`

## Scope

- Package: `@bytebank/design-system`
- Tooling: Storybook addon `a11y`, Storybook addon `vitest`, Vitest browser project, Playwright Chromium.
- Target: 0 axe violations in Design System stories.

## Commands

```bash
npm run test --workspace @bytebank/design-system -- --run
npm run build-storybook --workspace @bytebank/design-system
```

## Final Result

| Check                      | Result                                     |
| -------------------------- | ------------------------------------------ |
| Storybook Vitest a11y gate | PASS: 43 files, 199 tests                  |
| Storybook build            | PASS                                       |
| Accessibility gate mode    | PASS: `a11y.test` is configured as `error` |

## Known Warnings

| Source          | Warning                                                                     | Justification                                                                       |
| --------------- | --------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Storybook build | `No story files found for the specified pattern: stories/**/*.mdx`          | The DS currently uses `.stories.tsx`; no MDX stories are required for this task.    |
| Vite build      | Module-level `"use client"` directives are ignored while bundling Storybook | Expected for client React components bundled by Vite; build completed successfully. |
| Vite build      | Some chunks are larger than 500 kB                                          | Bundle size warning, not an accessibility violation.                                |

## Notes for Task 09

- `a11y.test` is configured as `error` in `packages/design-system/.storybook/preview.ts`.
- `@storybook/addon-a11y` and `@storybook/addon-vitest` are configured in `packages/design-system/.storybook/main.ts`.
- Storybook a11y checks run through `packages/design-system/vitest.config.ts` with Playwright Chromium.
- Charts expose screen-reader data through `AccessibleChartData`; visual Recharts output is hidden from assistive technology.
