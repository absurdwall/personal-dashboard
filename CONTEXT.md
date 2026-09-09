# Personal Dashboard

This context defines the product language for the private, local-first Personal Dashboard as it evolves across supported devices and feature areas.

## Language

**Personal Dashboard**:
The product and installed application. Its current feature area is exercise tracking, and later product decisions may add other personal-dashboard functions.
_Avoid_: Exercise Habit Tracker, generic habit engine

**Exercise tracker**:
The current Personal Dashboard feature area, comprising the established exercise-planning, reminder, recording, history, and backup behavior. It is not the permanent boundary of the product.
_Avoid_: Product name, generic habit framework

**Habits**:
A read-only Personal Dashboard feature area for reviewing sourced habit evidence across the current week, recent days, and bounded history. It is separate from the Exercise tracker and does not itself record or schedule activity.
_Avoid_: Exercise tracker, habit editor, generic habit framework

**Habit snapshot**:
A bounded, dated set of derived habit evidence with explicit provenance and coverage, prepared outside Personal Dashboard for Habits to read. It is not an authoritative task store or a live source connection.
_Avoid_: Habit database, live sync, Dida365 mirror

**Baseline behavior**:
The user-visible exercise workflows already provided by the completed local web version and protected as the product evolves.
_Avoid_: Old web edition, legacy product

**Standalone app**:
A complete local Personal Dashboard installation that can operate on its device without depending on another device, an account, or synchronization.
_Avoid_: Companion, remote control

**Profile**:
One coherent collection of the user's Personal Dashboard data, currently comprising the exercise schedule, decisions, and history. A profile is local data, not an account.
_Avoid_: Account, cloud identity

**Authoritative device**:
The one device on which a profile is actively recorded and reminders are acted upon. Until synchronization exists, another device must receive the profile through a deliberate transfer before becoming authoritative.
_Avoid_: Primary device, synced device

**Native app behavior**:
Operating-system installation, launch, local file access, notifications, and lifecycle integration. It does not require the interface to use each platform's native visual controls.
_Avoid_: Fully native UI

**Mac workspace**:
The action-first Personal Dashboard surface where current exercise state and timely actions are available together in a typical Mac window, while history and administration remain reachable as secondary destinations.
_Avoid_: Landing page, whole-window scrolling document

**Baseline migration**:
The automatic, one-time, rollback-safe adoption of the completed local web version's data by the evolving Mac app.
_Avoid_: Manual re-entry, destructive conversion

**Profile backup**:
A recovery copy of a profile that leaves its authoritative device active.
_Avoid_: Profile move, synchronization

**Profile move**:
A deliberate transfer that makes the source profile inactive and activates the imported profile on the destination device.
_Avoid_: Backup, merge, synchronization

**Inactive profile**:
A retained profile that does not accept new exercise activity or issue reminders while another device is authoritative.
_Avoid_: Deleted profile, synced replica
