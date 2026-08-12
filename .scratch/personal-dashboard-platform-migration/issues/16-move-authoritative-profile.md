# 16 — Move the authoritative profile safely

**What to build:** Let the user deliberately move a profile between standalone devices without synchronization by deactivating the source, activating the validated destination, and providing a recoverable failure path without ever merging divergent histories.

**Blocked by:** 15 — Back up and restore the complete profile.

**Status:** ready-for-agent

- [ ] Profile move is presented as a distinct operation from profile backup and restore.
- [ ] A move export contains the complete validated profile and authority metadata required by the destination.
- [ ] Completing move export makes the source profile inactive through an explicit, visible transition.
- [ ] An inactive profile retains its data but issues no reminders and refuses new exercise activity.
- [ ] Importing a valid moved profile with confirmation activates it on the destination.
- [ ] Invalid, unsupported, cancelled, or incomplete import does not activate or partially replace destination state.
- [ ] The source can be deliberately reactivated when transfer fails, with a clear warning against simultaneous authority.
- [ ] The app never offers to merge an active local history with an imported moved history.
- [ ] Copying a backup remains a backup and does not silently change either device's authority.
- [ ] The primary application seam uses isolated device states to verify export, inactivity, import, activation, reminder suppression, refusal of activity, and failure recovery.
