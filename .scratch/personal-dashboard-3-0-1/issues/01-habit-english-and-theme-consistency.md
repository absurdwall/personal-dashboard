# 01: Habit English names and consistent theme controls

Type: task

Status: resolved

Blocked by: Dashboard 4 ticket 11, integrated into canonical branch at d517e7f (verify current state).

## Scope

User requested three small 3.0.1 changes, to be implemented by Luna Max and then presented for acceptance. Preserve the existing product layout and all persistent task semantics. Follow `/Users/tingranwang/.agents/skills/implement/SKILL.md`: targeted regression tests, implementation, relevant full checks at the end, independent code review and bounded commit.

### 1. Habit English display names

Existing `docs/habit-names-v1.md`, `frontend/habit-presentation.ts` and ticket 06 already support independent zh/en names in the Vault-owned sidecar, keyed by stable Habit identity. Diagnose why the user's existing habits still lack English display: missing configuration, rendering coverage, or both. Do not rebuild this mechanism.

- [x] English interface shows meaningful English names for the user's existing Habits wherever Habit names are rendered; Chinese retains Chinese names. Preserve fallback for unknown/unconfigured future habits.
- [x] Inspect the selected Vault/catalog only as needed. The user has authorized adding English Habit display names: make only a bounded, atomic update to the existing names sidecar if needed, with recoverable backup. Preserve existing translations and unknown entries, match stable keys exactly, never infer identity by fuzzy name matching. Personal configuration and real Habit names stay out of Git, reports and committed fixtures.
- [x] Do not alter source habit names, keys, goals, completion history, Daily Records, snapshot sources, Dida365 or automation. No new Habit creation/goal-management UI or translation service. Test language switching and snapshot refresh with synthetic data; real configuration changes are limited to the authorized display-name fields.

### 2. Task action-button contrast

User reports New Task has dark/gray text on a green background, unlike other readable primary controls.

- [x] Diagnose actual computed styling, including cascade/disabled state, for New Task and Refresh Tasks. Reuse existing shared button conventions rather than patching one label with a hardcoded color.
- [x] New Task is a primary theme-colored button with white text and readable hover/focus/active states. Refresh Tasks is secondary with a neutral or subtle theme surface/border and high-contrast text. Disabled buttons are recognizable without making enabled controls look disabled.
- [x] Normal-size enabled button text meets 4.5:1 contrast across every offered theme palette; verify computed foreground/background, not class-name presence alone.

### 3. Consistent theme palettes

Settings offers forest/blue/clay/lilac. User observes that choosing purple changes some accents but sidebar selection and Choose Image or other buttons remain green.

- [x] Trace the existing appearance configuration, CSS variables, hardcoded colors and overrides. Define/reuse coherent accent, strong, soft, on-accent and focus roles per offered theme; all brand-accent consumers use that selected palette.
- [x] Cover toolbar and sidebar selection, Today/Tasks/Calendar/Habits, primary/secondary actions, Settings including Choose Image, selected tabs/check controls, links and focus indicators. Existing backgrounds/images and independent appearance options remain intact.
- [x] Preserve meaningful error/warning/success colors and user/source category colors where they represent a distinct meaning; do not recolor all green pixels blindly. Swatches must continue previewing their own palettes.
- [x] Palette changes apply immediately and survive relaunch using the existing preference scope. Green remains the existing default; switching purple and back produces no stale mixed theme accents.

## Verification and delivery

- [x] Add focused behavioral regressions at current appearance/name seams; inspect rendered UI before/after with synthetic fixtures. Validate all palette options and wide/narrow layouts in Chinese/English, with unobstructed representative screenshots and contrast measurements. No new dependencies/services.
- [x] Update app/package version declarations and applicable lock metadata consistently to 3.0.1 without dependency upgrades. Keep bundle ID unchanged and preserve all post-3.0 task features.
- [x] Run relevant typecheck, frontend/Rust checks, build and isolated packaged verification as warranted by changes. Independently review the bounded diff using Luna Max; fix material findings before handing back for user acceptance. Identify exact commit and bundle path; distinguish fixture proof from real-data/config changes.
- [x] Build a reviewable candidate, commit bounded source/test/doc work and update ticket/map evidence. Do not install a second daily App or launch/register a new everyday entry. Daily replacement/install and push are not part of this ticket's requested implementation handoff; leave the candidate ready for acceptance and preserve the stable /Applications entry. Do not mark the unrelated Drive acceptance complete.

## Answer

Implemented in commit `f17e5ca` (`feat: polish personal dashboard 3.0.1`). The reviewable candidate bundle is:

`src-tauri/target/release/bundle/macos/Personal Dashboard.app`

Evidence:

- All 105 frontend tests pass; `npm run build` and `cargo check --manifest-path src-tauri/Cargo.toml` pass.
- `npm run build:mac` produced the 3.0.1 macOS app with the existing bundle identifier.
- Playwright fallback rendered all four palettes. Computed New Task contrast was 9.39, 6.67, 6.87, and 7.60; Refresh Tasks was 6.98 across the palettes. Hover, keyboard focus, active, and disabled states were inspected. Browser plugin was unavailable.
- The final isolated packaged Dashboard 4 workflow passed with eight wide/narrow Chinese/English screenshots under `output/playwright/pd301-final-captures/`, including lifecycle persistence across relaunch, Vault switching, and conflict-draft recovery. It used synthetic Vaults only.
- The selected Vault received only the authorized English Habit sidecar fields, with a user-local recoverable record of the pre-change missing-sidecar state; personal configuration remains outside Git and this ticket.
- Two independent Luna Max reviews found no remaining code-level spec gap or standards violation. Remaining Drive acceptance is separate and unresolved.

## Working boundaries

Start from the integrated canonical implementation, not main (main still predates these features). Verify Git state and preserve unrelated changes. Prefer existing Luna worktree; incorporate the canonical integrated commit without discarding its local work. Copy this ticket/map there for implementation tracking; read source checkout planning files via absolute paths when absent. Do not merge a throwaway prototype, redesign navigation, change storage schemas unnecessarily, or broaden into 4.1.

## Comments

- User-approved scope: English Habit display, readable task buttons, coherent selected-theme palette. Cosmetic choices within existing style delegated to implementer. Acceptance follows implementation.
