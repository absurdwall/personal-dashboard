# PDEX-13 — Today untimed panel implementation evidence

Date: 2026-10-11. Implementation complete on worker; ticket remains in-progress. Frozen packaged candidate, independent review, reviewed normal installation and human acceptance are separate pending root-owned stages. Previous PDEX-01–11 acceptance remains complete.

Base `0f7820eecb11c3eedcc33b2c69a216e1e69523ba`; feature commit `9850b9b`; current integration `0414a23` retained through unsquashed merge `69dc6f189cfabb6e21821b15a00ed4cf553b4d82`. Branch `codex/pdex-13-unlocated-panel`; owned managed worktree `pdex-unlocated-panel`. No GitHub/main, installed App, live UI or personal data action.

## Behavior and transient state

The Today daytime toolbar now exposes Show/Hide untimed items with the current plan/fact count and truthful aria-expanded state. The same original region and detail nodes move into a native HTML dialog when shown at viewport widths <=1100px, preserving complete original content, precision, source labels, edit controls and open detail state. Wide automatic layout shows the original side panel; medium/narrow automatically collapses it before existing navigation switches at680px. Collapse gives the primary timeline the full local width and keeps other side-region content below it rather than deleting/hiding it.

A manual show/hide override lasts for the current Today selection/phase. Same-selection readback retains it; phase/date/destination changes reset to automatic mode. Resize adapts manual show between inline and modal drawer. Close or Escape collapses and returns trigger focus. Resizing a drawer to wide restores its original region; it does not recreate business records or emit mutation commands. Calendar, existing navigation and global layout rules were not changed; added CSS applies only to Today and its untimed drawer.

## TDD and real rendered geometry

Pre-agreed seams: production macOS WebKit DOM/input/geometry and public Tauri commands. First medium-width test was red (`false !== true`, panel visible at1000); implemented automatic collapse/count, then green. Narrow drawer slice was red (no dialog), then green after real modal presentation/focus. Resize found stale cached media-query state in the offscreen WebKit boundary; production now reads current viewport width, with a public resize listener.

The geometry is actual WebKit client dimensions, not desktop outer-window geometry. Client height758 throughout:

| Client width | Automatic axis width | Existing navigation | After toggle axis | Drawer |
|---|---:|---:|---:|---|
|1280|674.6875|184px vertical|978.21875|No; panel hidden|
|1000|698.21875|184px vertical|698.21875|410px retained region|
|960|658.21875|184px vertical|658.21875|410px retained region|
|830|569.8125|160px vertical|569.8125|410px retained region|
|640|551|existing640px horizontal|551|410px retained region|

Thus medium automatic collapse frees approximately250px versus the prior1000px layout, while wide manual hide frees303.53125px. Opening a narrow drawer leaves the axis width exactly unchanged. Production WebKit verifies count2, original untimed plan and confirmed-fact text/source retention, modal focus, close/Escape focus, node/open-detail preservation, nonzero80px axis reading position retained through resize, automatic/manual adaptation and phase reset. Resizing the native test WebView frame changes real geometry; the offscreen harness explicitly delivers the public resize event because its OS resize notification is suppressed. This is qualified rendered behavior evidence, not native installed-App gesture acceptance. Root should prepare candidate initial outer geometry1000×758 and confirm real native actions separately.

## Validation

- `npm run build`: isolated worker dist, passed. Uses existing canonical node_modules symlink; no installation/dependency change.
- Four focused Today/axis files:42 passed,0 failed,0 skipped. Includes4 new production-bootstrap WebKit tests plus existing placement, dense stacks, detail, quiet-hours, reading anchors and time-source regression.
- `npm run test:frontend`:441 passed,0 failed,0 skipped.
- Existing public-input browser Task/plan gesture regressions:16 passed,0 failed in headless Chrome. Production built main/CSS/DOM and synthetic Tauri IPC verify Task selection/create, details, ordinary plan move/resize, readback recovery, held scrolling/Escape and invalid movement; no Rust or native persistence result is inferred from these responses.
- Existing fragment-test harnesses now load the actual new presentation function instead of omitting its dependency. The prior fake Element serializer is minimally adapted to DOM text children appended by the existing locale repair. No product workaround for tests.

[Immutable artifact index](pdex-13-artifacts.json) lists absolute retained logs, bytes and SHA256 under `/tmp/pdex13-evidence-20261011.noindex` plus geometry. Rust/business stores unchanged. Root owns subsequent canonical combined-feature tests, fresh isolated package identity, native synthetic-Vault checks and reviewer handoff. No installation or human acceptance claimed here.
