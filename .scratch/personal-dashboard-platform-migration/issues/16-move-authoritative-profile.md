# 16 — Move the authoritative profile safely

**What to build:** Let the user deliberately move a profile between standalone devices without synchronization by deactivating the source, activating the validated destination, and providing a recoverable failure path without ever merging divergent histories.

**Blocked by:** 15 — Back up and restore the complete profile.

**Status:** resolved

- [x] Profile move is presented as a distinct operation from profile backup and restore.
- [x] A move export contains the complete validated profile and authority metadata required by the destination.
- [x] Completing move export makes the source profile inactive through an explicit, visible transition.
- [x] An inactive profile retains its data but issues no reminders and refuses new exercise activity.
- [x] Importing a valid moved profile with confirmation activates it on the destination.
- [x] Invalid, unsupported, cancelled, or incomplete import does not activate or partially replace destination state.
- [x] The source can be deliberately reactivated when transfer fails, with a clear warning against simultaneous authority.
- [x] The app never offers to merge an active local history with an imported moved history.
- [x] Copying a backup remains a backup and does not silently change either device's authority.
- [x] The primary application seam uses isolated device states to verify export, inactivity, import, activation, reminder suppression, refusal of activity, and failure recovery.

## Comments

Authority and pending native reminder cancellations are device-local profile
state. Failed cancellation leaves the source safely inactive, persists the
remaining notification identifiers, and retries them on later opens before
reactivation. The same journal removes stale destination reminders after a
confirmed replacement without rolling back the activated moved profile.

## Answer

Implemented a distinct, offline profile move document and native save/open
flow. A saved move deactivates the source, suppresses reminders and mutations,
and exposes deliberate recovery; a validated, confirmed import atomically
replaces and activates the destination without merging histories. Isolated
application tests cover cancellation, malformed and unsupported documents,
interrupted replacement, reminder retry across relaunch, and backup authority
neutrality. On 2026-08-14 the packaged arm64 app completed the recorded native
source-to-destination acceptance flow.
