# 07 — Show the persistent exercise week and first departure reminder

**What to build:** Establish the production Personal Dashboard exercise tracer bullet: a persistent default exercise week, an actionable current-week dashboard, and the first native departure reminder, all owned by the shared Rust core and protected through the new highest-level application seam.

**Blocked by:** 05 — Install the minimal shell on the target iPad; 06 — Install the minimal shell on the target Samsung phone.

**Status:** resolved

- [x] A fresh profile presents the established repeating primary and ordered fallback schedule without changing any exercise rule.
- [x] The dashboard leads with current qualifying progress and shows the next departure and fallback availability.
- [x] The product is visibly Personal Dashboard, with exercise tracking presented as its current feature area.
- [x] The default week and routine persist in versioned JSON across packaged-app relaunch.
- [x] The Rust core owns schedule creation, current-week derivation, and reminder intent independently of presentation and platform adapters.
- [x] A due departure schedules or delivers the established native reminder while the window is closed.
- [x] No ordinary workflow requires Python, localhost, a browser, network access, an account, or synchronization.
- [x] One primary application-workflow seam controls time and isolated profile state and asserts visible dashboard state, reminder intent, and persistence.
- [x] The baseline's first tracer-bullet scenarios are ported by observable behavior rather than HTTP or subprocess implementation.

## Answer

Personal Dashboard now opens on a real current-week exercise view backed by a
shared Rust application core. A fresh local profile creates the established
three-workout routine without changing its rules: Monday, Wednesday, and
Friday primary departures at 4:00 PM, followed by ordered Saturday and Sunday
fallbacks at 4:00 PM. The interface leads with qualifying progress, the next
departure, both schedules, fallback availability, and reminder state while
retaining Personal Dashboard as the product and Exercise tracking as its
current feature area.

The core owns week derivation, schedule creation, timezone-aware departure
epochs, visible exercise state, reminder intent, duplicate prevention, schema
validation, and persistence orchestration. Its versioned state is atomically
stored in app-owned `exercise.json`; native files, clock/timezone lookup, and
notification delivery remain adapters. When system permission is granted, the
next departure is registered as an OS-owned notification. Closing the Mac
window continues to hide rather than quit the app, so the scheduled request is
not tied to an open WebView.

`src-tauri/tests/application_workflow.rs` is the new highest-level exercise
seam. With a fixed New York clock, isolated profile persistence, and reminder
outbox, it ports the baseline's first tracer-bullet behavior: exact visible
week/progress/schedule wording, ordered fallbacks, the Monday reminder intent,
state equality after relaunch, and no duplicate native scheduling. It tests
product behavior rather than Python subprocess or HTTP transport.

Verification passed for the TypeScript and Rust build, Rust unit and
application-workflow tests, all 20 completed-baseline Python workflow tests,
Clippy with warnings denied, the npm vulnerability audit, arm64 iOS and Android
Rust checks, a packaged-window visual/accessibility inspection, and the arm64
Mac packaged-launch acceptance. The `.app` still launches through macOS
without Python, a localhost listener, a managed browser, network access, an
account, or synchronization.
