# Personal Dashboard

This context defines the product language for the private, local-first Personal Dashboard 2.0 and its boundary with the user's Tortilla Flat vault and external daily flow.

## Language

**Personal Dashboard**:
The installed application for reading and making bounded updates to Daily Records, reviewing calendar history, and viewing sourced habit evidence.
_Avoid_: Exercise Habit Tracker, generic habit engine

**Selected vault**:
The Tortilla Flat Obsidian vault explicitly chosen as the source of canonical Daily Records and the derived habit snapshot. It remains user-owned data outside the application-data directory.
_Avoid_: App database, imported vault

**Daily Record**:
The canonical Markdown record for one lived calendar day in the selected vault.
_Avoid_: App note, dashboard ledger

**Today**:
The Personal Dashboard destination that presents the selected day's Daily Record as morning, daytime, and evening phases and permits only bounded documented updates.
_Avoid_: Exercise dashboard, daily planner

**Calendar**:
The Personal Dashboard destination for locating and opening a dated Daily Record without creating a second history store.
_Avoid_: Exercise history, event calendar

**Habits**:
The Personal Dashboard destination for reviewing sourced habit evidence across the current week, recent days, and bounded history. It may add or correct dated exercise Short records, but it does not record habit completion or schedule activity.
_Avoid_: Exercise tracker, habit check-in, generic habit framework

**Habit snapshot**:
A bounded, dated projection of habit evidence with explicit provenance and coverage, prepared outside Personal Dashboard for Habits to read.
_Avoid_: Habit database, live sync, Dida365 mirror

**Short record**:
A dated free-text Daily Record entry with a stable identity, an optional exercise association, and an append-only correction trace. It can provide visible context but is not habit-completion evidence.
_Avoid_: Habit completion, workout log, check-in

**Morning baseline**:
The independently retained initial arrangement and its contemporaneous basis for a lived day.
_Avoid_: Current plan, reconstructed plan

**Current arrangement**:
The latest explicit arrangement for the lived day; daytime replanning may change it while preserving the morning baseline.
_Avoid_: Morning baseline, inferred schedule

**Daily-flow producer**:
The external Agent flow that writes compatible Daily Records and atomically publishes validated habit snapshots from already-read sources. Personal Dashboard is not this producer.
_Avoid_: Dashboard sync, background poller

**Retired Exercise runtime**:
The former Profile, weekly exercise planner, workout history, backup/move, baseline-migration, and reminder behavior retained only for historical validation and bounded cutover parsing.
_Avoid_: Current feature area, fallback UI

**2.0 cutover**:
The explicitly authorized, idempotent retirement of the exact old app-owned Exercise/Profile state and reminders before the reviewed 2.0 candidate becomes the active installation.
_Avoid_: Automatic migration, broad cleanup

**Native app behavior**:
Operating-system installation, launch, local file access, and lifecycle integration without requiring each interface element to use native visual controls.
_Avoid_: Fully native UI
