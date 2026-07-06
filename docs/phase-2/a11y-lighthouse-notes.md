# Lighthouse A11y Notes

Branch: dev2/a11y-lighthouse

## Scope

- `/login`
- `/`
- `/transactions`

## Tooling

- Lighthouse Accessibility via `npx lighthouse`
- Manual keyboard pass with Tab/Enter/Escape
- VoiceOver or NVDA smoke pass

## Baseline

Date: 2026-07-06

Local setup:

- shell: `http://localhost:3000`
- dashboard-mfe: `http://localhost:3002/mf-manifest.json`
- transactions-mfe: `http://localhost:3003/mf-manifest.json`

Command pattern:

```bash
npx lighthouse http://localhost:3000/<route> --only-categories=accessibility --output=json --output-path=/tmp/bytebank-lh-<route>.json --chrome-flags="--headless --no-sandbox"
```

| Page            | Accessibility score | Status | Notes                                 |
| --------------- | ------------------: | ------ | ------------------------------------- |
| `/login`        |                 100 | PASS   | Public route measured directly.       |
| `/`             |                 100 | PASS   | Baseline passed automated Lighthouse. |
| `/transactions` |                 100 | PASS   | Baseline passed automated Lighthouse. |

## Final Results

Date: 2026-07-06

Private routes were audited with an authenticated Chromium profile because the local Postgres service was not available during validation (`ECONNREFUSED` on user registration). The profile used a temporary Auth.js JWT session for the seeded `joana` user only during the Lighthouse run.

| Page            | Accessibility score | Status | Final URL                            |
| --------------- | ------------------: | ------ | ------------------------------------ |
| `/login`        |                 100 | PASS   | `http://localhost:3000/login`        |
| `/`             |                 100 | PASS   | `http://localhost:3000/`             |
| `/transactions` |                 100 | PASS   | `http://localhost:3000/transactions` |

## Manual Checks

- Skip link: PASS in Playwright keyboard smoke (`Tab` focuses link, `Enter` moves focus to `#main`) on `/login`, `/`, and `/transactions`.
- Keyboard navigation: automated skip-link smoke passed; full Tab/Enter/Escape route pass still pending manual confirmation.
- Charts announced through accessible data: chart wrappers keep accessible data descendants available; pending VoiceOver/NVDA smoke confirmation.
- Form errors announced: implemented through `role="alert"` helper text plus `aria-describedby`/`aria-invalid` on DS inputs/selects; pending screen reader smoke confirmation.
- Modals and mobile drawer: implementation checked for focus trap/Escape support; pending manual confirmation.

## Notes

- `docs/superpowers/` contains local execution plans and must stay out of commits.
- Lighthouse outputs were written to `/tmp/bytebank-lh-*-final.json` and `/tmp/bytebank-lh-*-profile-final.json`.
