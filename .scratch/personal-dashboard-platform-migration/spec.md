# Personal Dashboard platform migration

Status: ready-for-agent

## Problem Statement

The completed local exercise tracker works through a Python command and a localhost browser page. Although its behavior is complete and tested, it does not feel like an ordinary Mac application: launching it requires Terminal and browser coordination, its runtime remains visible to the user, and its packaging model does not provide a practical foundation for later standalone iPad and Samsung-phone editions.

The user wants to evolve this same product and repository into Personal Dashboard. Exercise tracking remains the only current feature area, and all established exercise behavior must survive the platform change. The application should first become a private, installable, launchable, offline Mac app. It should later have a credible path to full standalone iPad and Samsung-phone apps without introducing accounts, cloud storage, synchronization, or a second maintained web edition.

The migration must not trade away the completed baseline. Existing data must be adopted automatically and safely, existing behavior must remain protected at a high-level application seam, and the old runtime must remain recoverable through Git history until the replacement has passed explicit Mac and mobile-path gates.

## Solution

Evolve Personal Dashboard in the existing repository into a Tauri 2 application. The Mac edition will be a real application bundle that launches from Applications without Python, localhost, or a separately managed browser. It will preserve the exercise tracker as its first feature area while leaving product naming and boundaries open to deliberately chosen future functions.

A shared Rust core will own product behavior, validation, state transitions, schema migration, and persistence orchestration. A plain TypeScript, semantic HTML, and CSS interface will present that behavior without requiring completely native-looking controls. Thin platform adapters will integrate notifications, local files, clock and timezone behavior, and application lifecycle.

Personal Dashboard will remain private, offline, and local-first. Each profile will have one authoritative device while synchronization is absent. Versioned JSON will remain the persistence and backup foundation. The first Tauri launch on the current Mac will automatically perform a one-time, rollback-safe baseline migration while preserving the original data unchanged.

Migration will use two capability gates. A bounded Mac gate will first prove native launch, JSON persistence, native import and export, and a notification while the window is closed. Before the Python runtime is removed, a second gate will prove that minimal Personal Dashboard shells compile and install on the target iPad and Samsung phone. Full mobile product implementation remains later work.

## User Stories

1. As the sole user, I want the installed product to be named Personal Dashboard, so that its identity can accommodate deliberately chosen functions beyond exercise in the future.
2. As the sole user, I want exercise tracking to remain the only feature area changed during this migration, so that a platform transition does not silently become a product redesign.
3. As the sole user, I want all completed exercise behavior preserved, so that changing platforms does not change how the tracker supports me.
4. As the sole user, I want the exercise rules left unchanged, so that the migration does not reopen settled habit decisions.
5. As the sole user, I want future feature expansion to remain possible, so that Personal Dashboard is not permanently limited to exercise.
6. As the sole user, I do not want a generic habit engine built speculatively, so that the current migration remains bounded and understandable.
7. As the sole user, I want the current repository to evolve into the app, so that there is one product history rather than a replacement project beside it.
8. As the sole user, I want the completed Python version preserved through Git history, so that the baseline can be recovered without maintaining it as a second edition.
9. As the sole user, I want one maintained product after cutover, so that behavior does not drift between a web edition and a Mac edition.
10. As the sole user, I want the Mac app to launch from Applications, so that opening Personal Dashboard feels like opening an ordinary app.
11. As the sole user, I want the app to launch without Terminal, so that normal use requires no development knowledge.
12. As the sole user, I want the app to launch without opening or managing a browser, so that its web technology is an internal implementation detail.
13. As the sole user, I want the shipping app to run without a localhost server, so that I do not have to manage ports or background web processes.
14. As the sole user, I want the shipping app to run without a separate Python installation, so that its runtime is self-contained.
15. As the sole user, I want the app to work offline, so that exercise planning and recording never depend on network availability.
16. As the sole user, I want personal data to stay on the current device, so that the private local-first boundary remains intact.
17. As the sole user, I want the interface to preserve the existing workflows and outcomes, so that visual implementation changes do not change product meaning.
18. As the sole user, I want the interface to adapt to its device, so that native app behavior does not require identical layouts on Mac, iPad, and phone.
19. As the sole user, I do not require every control to imitate the platform's native visual toolkit, so that one shared interface remains practical.
20. As the sole user, I want system-integrated file selection, so that backup and restore feel like app operations rather than command-line operations.
21. As the sole user, I want system notifications, so that reminders are delivered through the device's normal notification experience.
22. As the sole user, I want reminders to work while the Mac window is closed, so that the dashboard does not need to remain visible.
23. As the sole user, I would like already scheduled reminders to work after a normal Quit, so that closing the process need not cancel the plan when the platform supports this reliably.
24. As the sole user, I accept that after-Quit reminder delivery is not a first-release gate, so that this desirable capability does not block the entire platform migration.
25. As the sole user, I want local state to survive app relaunch, so that installing a native shell does not make my history disposable.
26. As the sole user, I want the app to keep using versioned JSON, so that the current small local dataset remains inspectable and portable.
27. As the sole user, I want schema evolution to be explicit, so that future versions can safely understand older local data.
28. As the sole user, I want the first Mac launch to detect my completed tracker data, so that I do not need to find and import it manually.
29. As the sole user, I want baseline migration to validate the old data before changing anything, so that malformed or unsupported state cannot corrupt the new app.
30. As the sole user, I want baseline migration to preserve the original file unchanged, so that I have a rollback source if the new app fails.
31. As the sole user, I want baseline migration to happen only once, so that later launches cannot duplicate or repeatedly convert my history.
32. As the sole user, I want migration failure to leave the completed baseline usable, so that adopting the new app is recoverable.
33. As the sole user, I want the migrated dashboard and history to match the completed baseline, so that a successful migration is observable through product behavior.
34. As the sole user, I want backup to create a recovery copy while leaving this device active, so that protecting my data does not change where I use the app.
35. As the sole user, I want restore to replace local profile state only after validation and confirmation, so that an accidental file choice cannot silently destroy valid data.
36. As the sole user, I want a profile move to be distinct from a backup, so that changing devices has an explicit authority transition.
37. As the sole user, I want moving a profile to make the source inactive, so that two devices do not both claim to own the same unsynchronized history.
38. As the sole user, I want importing a moved profile to activate the destination, so that the new device becomes the clear place to record activity and receive reminders.
39. As the sole user, I want an inactive profile to retain its data without accepting new activity or issuing reminders, so that device transfer is reversible without creating divergent histories.
40. As the sole user, I want to reactivate a source profile if a transfer fails, so that a failed move cannot strand my data.
41. As the sole user, I do not want two profile histories merged without synchronization semantics, so that the app never invents a single truth from conflicting records.
42. As the sole user, I want exactly one authoritative device per profile, so that progress and reminder responses remain coherent while sync is absent.
43. As the sole user, I want the first Mac release to support my current Apple Silicon Mac, so that the private release targets the device I actually use.
44. As the sole user, I do not need the first release to promise Intel Mac support, so that unused compatibility work does not delay the migration.
45. As the sole user, I do not need the first release to promise older macOS versions, so that the initial support boundary stays private and concrete.
46. As the sole user, I want a real application bundle that I can copy into Applications, so that installation is familiar and direct.
47. As the sole user, I would accept a DMG when it is convenient, so that packaging polish can be added without becoming a release gate.
48. As the sole user, I do not require signing or notarization for the private first release, so that public distribution infrastructure remains deferred.
49. As the sole user, I do not require automatic updates, so that the first app can be delivered without an update service.
50. As the sole user, I want the platform foundation to target iPad, so that a later iPad edition does not require choosing a second application framework.
51. As the sole user, I want the platform foundation to target Samsung phones, so that a later Android edition has a practical route from the Mac product.
52. As the sole user, I want future iPad and Samsung editions to be full standalone apps, so that neither depends on a running Mac.
53. As the sole user, I want future standalone editions to include the complete product behavior available at that stage, so that mobile does not become a read-only companion.
54. As the sole user, I want the actual owned iPad and Samsung phone used for validation, so that the mobile path is proven against real target devices.
55. As the sole user, I accept that exact mobile models and OS versions can be recorded when the mobile-path gate begins, so that missing device metadata does not block the Mac capability gate.
56. As the sole user, I want the Mac capability gate completed before the full migration, so that Tauri proves the essential native-app boundary early.
57. As the sole user, I want the Mac gate to prove launch without Python or localhost, so that a wrapped baseline cannot be mistaken for the target architecture.
58. As the sole user, I want the Mac gate to prove persistent versioned JSON, so that the chosen storage boundary works inside the packaged app.
59. As the sole user, I want the Mac gate to prove native backup export and import, so that file access is validated before full migration.
60. As the sole user, I want the Mac gate to prove a notification while the window is closed, so that the app satisfies the required reminder lifecycle.
61. As the sole user, I want a minimal iPad shell compiled and installed before Python is removed, so that a fundamental Apple-mobile incompatibility is discovered before cutover.
62. As the sole user, I want a minimal Samsung-phone shell compiled and installed before Python is removed, so that a fundamental Android incompatibility is discovered before cutover.
63. As the sole user, I do not require full mobile features during the Mac migration, so that the two-stage gate does not become three simultaneous product builds.
64. As the sole user, I want the high-level exercise workflow scenarios ported to the Tauri app, so that preserved behavior is proven at the same product altitude as the baseline.
65. As the sole user, I want the Python runtime removed only after behavioral parity and both gates succeed, so that the completed baseline is not discarded prematurely.
66. As the sole user, I want failed gates to stop the cutover and leave the baseline intact, so that platform risk remains recoverable.

## Implementation Decisions

- The installed product and application name is Personal Dashboard. Exercise tracking is the only current feature area, but it is not the permanent product boundary.
- This effort evolves the existing repository. It does not create a separately maintained successor project or web edition.
- The completed Python application must be identified by a recoverable Git reference before platform work changes the baseline.
- Tauri 2 is the application foundation for Mac and the planned iPad and Android targets.
- The final shipping architecture contains no Python runtime, localhost HTTP server, browser launch, dynamic local port, or permanent Python sidecar.
- A shared Rust core owns product behavior, state transitions, validation, schema migration, and persistence orchestration.
- Plain TypeScript, semantic HTML, and CSS own presentation and temporary interface state.
- No additional frontend framework is approved initially. A later framework decision requires evidence that the plain interface has become difficult to maintain and separate approval under project rules.
- Platform adapters form explicit boundaries around notifications, local persistence access, file import and export, clock and timezone behavior, and application lifecycle.
- Product behavior must remain independent of platform adapters so the same core can operate on Mac, iPad, and Android.
- The interface may adapt its layout and platform chrome, but it must preserve the established user-visible actions, option sets, ordering, outcomes, and accessibility semantics.
- Versioned, file-backed JSON remains the local persistence mechanism. SQLite or another database is not introduced by this migration.
- The internal JSON representation may evolve. Compatibility is promised through explicit migrations and backup contracts rather than permanent byte-for-byte schema stability.
- Baseline migration is automatic, one-time, validating, and rollback-safe on the same Mac.
- Baseline migration reads the completed tracker state, validates it without mutation, preserves the original unchanged, and atomically writes the new app-owned state.
- The migrated state records that baseline migration succeeded so later launches do not repeat it.
- Failed or interrupted baseline migration must not replace valid old or new state and must present a controlled, actionable result.
- The application must not dual-write old and new state formats.
- A profile is local data rather than an account or cloud identity.
- Each profile has one authoritative device while synchronization is absent.
- A profile backup exports a recovery copy and leaves the source profile active.
- A profile move is a distinct operation that exports the profile and makes the source inactive. Importing the moved profile activates the destination.
- An inactive profile retains its data but does not accept new activity or issue reminders. It may be deliberately reactivated if transfer fails.
- Restore and profile-move import replace destination state only after validation and explicit confirmation. This effort does not define merging.
- Native system notifications replace the current process-managed macOS notification mechanism.
- Delivery while the window is closed is required for the first Mac release.
- Delivery after a normal Quit is desirable and must be observed during capability work, but failure of that case alone does not reject Tauri or block release.
- The private first release targets the current Apple Silicon Mac and current macOS environment only.
- The first deliverable is a real application bundle that can be copied into Applications. A DMG is optional rather than required.
- Developer ID signing, notarization, App Store distribution, public distribution, automatic updates, and public support infrastructure are deferred.
- Tauri and the build dependencies required to implement the accepted architecture are approved. Unrelated dependencies, external services, and deployment configuration still require explicit approval.
- Later iPad and Samsung-phone editions are full standalone Personal Dashboard apps, not companions or remote controls for the Mac.
- Exact iPad and Samsung models and OS versions must be recorded before the mobile-path gate is executed.
- Stage one is a bounded Mac capability gate. It proves application-bundle launch without Python or localhost, versioned JSON persistence across relaunch, native file export and import, and a native notification while the window is closed.
- Stage two occurs before removal of the Python runtime. It proves that minimal Personal Dashboard shells compile and install on the actual target iPad and Samsung phone.
- Stage two does not require mobile exercise features, behavioral parity, mobile notification parity, profile transfer, distribution packaging, or production visual polish.
- Failure of either required gate stops cutover while the completed baseline remains recoverable.
- After both gates, the established exercise behavior is migrated incrementally behind the shared Rust core and Tauri interface.
- The active application tests are ported to the Tauri product boundary. The Python runtime is not retained merely to keep its test suite executable.
- Python and localhost are removed from the active shipping product only after data migration and user-visible behavioral parity are proven.
- Later functions for Personal Dashboard require their own product decisions. This effort must not introduce a generic habit schema, plug-in system, module marketplace, or generalized dashboard framework in anticipation of unknown features.

## Testing Decisions

- Use one primary end-to-end Personal Dashboard seam for preserved product behavior. Drive user-visible actions, control time, isolate profile state, observe presented state and emitted reminder intent, and verify relaunch and persistence outcomes without asserting Rust, TypeScript, serialization, or component internals.
- Treat the existing highest-level Python application-workflow scenarios as the behavioral inventory and prior art. Port their observable scenarios to the Tauri seam rather than preserving their HTTP transport or subprocess mechanics.
- The primary seam must cover every completed exercise workflow before Python removal. The platform migration must not weaken coverage merely because the transport changes.
- The primary seam must continue to verify visible dashboard state, scheduling actions, reminder decisions, recording flows, history correction and deletion, backup and restore, week rollover, and persisted outcomes with a controllable clock.
- The primary seam must verify that the installed product identifies itself as Personal Dashboard while presenting exercise tracking as its current feature area.
- The primary seam must verify that no ordinary workflow requires Python, localhost, a browser, a network connection, an account, or synchronization.
- Test baseline migration through application launch with representative valid completed state. Assert the resulting user-visible dashboard, history, schedule, reminder intent, and backup output rather than private conversion functions.
- Test migration failure with malformed, unsupported, and interrupted inputs. Assert that the original baseline remains unchanged and that no partially migrated state becomes active.
- Test one-time migration by relaunching after success and asserting that records are neither duplicated nor reconverted.
- Test backup, restore, profile move, profile activation, inactivity, and failed-transfer recovery through the same primary application seam.
- Test that an inactive profile issues no reminder intent and refuses new product activity until deliberately reactivated.
- Test that restore and move import validate before replacing state and never merge histories.
- Use test adapters behind the platform boundaries to make time, notifications, local files, and lifecycle deterministic at the primary seam. Do not create separate domain-testing seams for each adapter.
- Exercise real platform integration only in explicit acceptance modes so normal automated tests remain deterministic and do not display real notifications or file dialogs.
- The Mac capability acceptance check must launch the packaged application rather than a development server.
- The Mac capability check must prove no Python or localhost runtime is required, state survives relaunch, native export and import work, and a real notification arrives while the window is closed.
- Observe notification behavior after a normal Quit and record the result. Do not fail the migration solely because this desirable case is unsupported or unreliable.
- The mobile-path acceptance check must compile and install minimal shells on the actual iPad and Samsung phone before Python removal.
- The mobile-path gate proves toolchain and device reachability only. It does not claim mobile behavioral or notification parity.
- Test application-bundle installation and launch on the current Apple Silicon Mac. Do not infer Intel or older-macOS support from that result.
- A gate failure is a stopping result, not an invitation to delete, overwrite, or bypass the completed baseline.
- A good migration test asserts externally observable compatibility and recoverability. Tests must not freeze internal Rust module layout, TypeScript rendering strategy, plugin calls, JSON key ordering, temporary file names, or private adapter implementations.

## Out of Scope

- Changing, reinterpreting, or expanding the established exercise habit rules
- Adding a second current feature area to Personal Dashboard
- Building a generic habit tracker, generic dashboard framework, plug-in architecture, or speculative module system
- Maintaining the Python web application as a separate supported edition after cutover
- Permanently embedding the Python server as a Tauri sidecar
- Exposing the local HTTP application over a LAN or network
- User accounts, authentication, multi-user support, cloud storage, cloud backup, synchronization, or conflict resolution
- Simultaneous authoritative use of one profile on multiple devices
- Merging independently changed profile histories
- SQLite or another database
- React, Svelte, Vue, or another frontend framework without a later evidence-based decision and explicit approval
- A completely platform-native visual interface
- Menu-bar mode
- Automatic launch at login as a product requirement
- Guaranteed reminder delivery after the user explicitly quits the Mac app
- Full iPad or Android product implementation during the Mac migration
- Mobile behavioral parity, mobile notification parity, mobile profile transfer, or mobile production design during the stage-two shell gate
- Android tablets, Android devices other than the selected Samsung phone, iPhone, Windows, Linux, or web deployment
- Intel Mac and older-macOS support promises
- Developer ID signing, notarization, Mac App Store distribution, mobile store distribution, public distribution, automatic updates, telemetry, analytics, or public support infrastructure
- External services or deployment configuration

## Further Notes

- The completed baseline currently passes its full high-level application-workflow suite. That suite is evidence and scenario prior art, not a requirement to preserve Python or HTTP as the future test transport.
- The current baseline uses a single versioned JSON document and a separate macOS reminder runner. Tauri replaces those runtime mechanics while preserving user-visible behavior.
- The platform choice intentionally favors one application foundation and native operating-system behavior over completely native-looking controls.
- Tauri mobile support is accepted on the strength of its supported targets, with risk bounded by the stage-two compile-and-install gate before Python removal.
- The exact owned iPad and Samsung-phone models and OS versions remain to be recorded at the beginning of stage two. This does not block stage-one Mac capability work.
- Profile backup and profile move are different product operations. A copied backup file is not synchronization, and a move cannot technically prevent a user from duplicating a file; authority is enforced by app state and explicit product interaction rather than a cloud coordinator.
- The accepted domain language is maintained in the project glossary. The accepted platform choice and consequences are maintained in the Tauri ADR.
