# KRZ Boost frontend

Polished implementation of the approved `screen.png` Stitch design. Vanilla JavaScript ES modules and locally compiled Tailwind 3; Vite is build tooling, not an application framework. JavaScript is checked with TypeScript strict mode through JSDoc.

## Run

Requires Node.js 22.12+ (verified with Node.js 24).

```sh
npm ci
npm run dev
```

Open the local URL printed by Vite. Both `/` and `/code.html` load the dashboard. Development mode explicitly labels all screenshot telemetry as **mock data**.

```sh
npm run build
npm run preview
```

The production build uses disconnected/unknown telemetry. There is no Windows engine or native desktop packaging in this repository. Analysis reports the missing integration; applying changes is disabled. No scans, restore points, service changes, or optimizations are simulated as real operations.

## Structure

- `src/tokens.css`: neutral/red/green palette, spacing, radii, motion. Brighter muted text and darker filled-button red provide readable contrast.
- `src/styles.css`: shared Card, Button, Badge, StatusIndicator and desktop layout styles.
- `src/components/`: app shell, navigation, hardware metrics, original concentric system orb, and optimization cards.
- `src/interactions.js`: mode selection, local module search, native dialogs, keyboard shortcuts and explicit analysis feedback.
- `src/data/state.js`: typed disconnected state. Integrate real telemetry here when its source and schema exist; never substitute fixtures for missing data.
- `src/data/mock.js`: development-only screenshot fixtures. Vite's compile-time `DEV` branch excludes this module from production.

Navigation uses real dashboard section anchors, since the export provides only one page. Search supports Ctrl/Cmd+K; settings supports Ctrl/Cmd+,; Escape closes dialogs and restores focus. Smart/Advanced are session preferences.

`screen.png` and the current product brief are the visual authority. The original `DESIGN.md` is legacy reference and contains superseded colors, glass treatments, and navigation guidance.

## Verification

```sh
npm run format
npm run check
npx playwright install chromium
npm run test:e2e
```

`check` runs formatting, lint, strict typechecking, Node tests and a production build. Browser tests start development and production servers, verify mock isolation, keyboard/search/dialog behavior, disconnected errors, and desktop layouts at 1440×900, 1920×1080, 1366×768 and 1280×720. They also run axe checks and save full-page screenshots under `test-results/`.

The shell preserves the horizontal navigation and two-column dashboard at the supported desktop sizes; shorter windows scroll normally, with the footer in document flow. Reduced-motion and forced-color styles are included. Automated accessibility checks do not replace manual Windows screen-reader and native-shell testing.
