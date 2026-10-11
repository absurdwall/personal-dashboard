# Native-discovered frontend repairs — 2026-10-11

Source checkpoint: `477d439653b2d5b97eceff7db3f2aa562fbadd0d` on `codex/pdex-native-followups`, based on historical native candidate source `bc99cf2f45d288ca5abcd5de4fbf52ec831a12e6`. Integration evidence checkpoint `ea299e6c7182f3d620dbecc1e2eb492cb0047bdf` was merged without squashing before the repair commit. Rust subtree remains `b9b73d044325b00f0ee29513c60a3a6985370481`, identical to candidate A.

## Confirmed failures and repairs

- Candidate A restart capture 61 showed English surrounding UI with Chinese end-handle/stack-reveal labels and derived approximate times. Today starts loading before persisted language preferences resolve. Those new dynamic labels did not retain shared localization metadata. The production bootstrap regression delays only the native preference boundary and confirms Today first renders Chinese. Shared copy metadata now refreshes derived time fragments, handle/reveal aria labels and titles in place; source periods, source wording, dates, marker/detail nodes, open details, marker focus, stack front and scroll are retained.
- Candidate A capture 18 selected `/retro` had white text on a mint background. Production controller/CSS computed colors were `rgb(255, 255, 255)` on `rgb(231, 240, 235)`, 1.16:1 contrast. Selected candidates now use the existing parity ink token; the rendered contrast regression requires at least 4.5:1 and leaves editable completion behavior covered by the existing command tests.
- Candidate A capture 26 displayed the built-in saved-but-refresh-failed wrapper in Chinese under English. The shared diagnostic translator now narrowly recognizes the two native Today readback wrappers; technical error detail and paths remain verbatim. Plan recovery statuses retain copy/error metadata across locale changes. A production saved-readback-failure regression verifies English → Chinese → English, retained values/disabled controls, unchanged source presentation and exactly one write invocation, with reread offered. This is a simulated native IPC result in a rendered production page, not another packaged fault test.
- Point/approximate-point modal End groups had `hidden=true` but production author CSS still rendered them at 25 px height with one input rectangle. The scoped flex rule now excludes hidden groups. A rendered geometry regression verifies zero height/rectangles for both point forms and a visible editable End for ranges. Required modal locale refresh also exposed parent-label copy metadata deleting appended select/time controls; copy now belongs to caption spans, preserving the existing controls and typed values.

## Red → green validation

The new startup regression failed on the actual Chinese end-handle label; the new slash regression failed at 1.16:1 contrast; the two production modal regressions failed on the visible hidden End and Chinese native recovery wrapper. Harness setup timeouts were diagnosed before the startup assertion red: Chinese document locale is `zh-CN`; the final red log records the product assertion, not a scheduling failure.

Commands:

```sh
node --test tests/frontend/startup-interface-language.test.ts
node --test --test-name-pattern='readable foreground' tests/frontend/collaboration-command-completion.test.ts
npm run build
node --test --test-name-pattern='hide unused|saved readback diagnostic' tests/frontend/plan-time-editor.test.ts
npm run build
node --test tests/frontend/startup-interface-language.test.ts tests/frontend/collaboration-command-completion.test.ts tests/frontend/plan-time-editor.test.ts tests/frontend/interface-language.test.ts tests/frontend/unified-today-axis.test.ts
```

Final build exited 0. Final focused command exited 0: **43 passed, 0 failed, 0 skipped**. Existing rendered production plan retry/source-identity, slash composition/ordinary-text, unified axis layout/quiet-hour/scroll and localization cases passed together. No Cargo/native/package command or live UI input was run for this repair. The earlier 523 native / 432 frontend / 23 browser checkpoints remain historical; candidate A evidence does not accept this changed frontend. Root owns candidate B rebuild, CUA revalidation, tracker transitions and independent review notification. PDEX-09/PDEX-11 acceptance remains governed by those tracker records and outstanding actual IME/quota/held-drag gates.

External logs (outside the immutable candidate A artifact index):

| Log | SHA-256 |
| --- | --- |
| `/tmp/pdex-native-followups-startup-red.log` | `6b7c46d8368fb07fe3326ed504f0252469b3eb98f25e967a3cad56c27510acd4` |
| `/tmp/pdex-native-followups-contrast-red.log` | `00937d9992423191fd17117c4e4a5a814fe5fbd6a55170ffdad4852d32287bf9` |
| `/tmp/pdex-native-followups-modal-red.log` | `01f8f8980c7c2025ff2845032f2c6954ed673c2e7ff2569c937964d377f3c97c` |
| `/tmp/pdex-native-followups-build.log` | `02597e17085915d315b2cdc1503bd623f85bbea205b4cae594c1a372a6e091f7` |
| `/tmp/pdex-native-followups-focused.log` | `850a00ce46f6af5591b5441e2123b948d0a358f7eb60af2bdc4a31e70f0f0e74` |
