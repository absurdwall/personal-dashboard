# 07 — Show the persistent exercise week and first departure reminder

**What to build:** Establish the production Personal Dashboard exercise tracer bullet: a persistent default exercise week, an actionable current-week dashboard, and the first native departure reminder, all owned by the shared Rust core and protected through the new highest-level application seam.

**Blocked by:** 05 — Install the minimal shell on the target iPad; 06 — Install the minimal shell on the target Samsung phone.

**Status:** ready-for-agent

- [ ] A fresh profile presents the established repeating primary and ordered fallback schedule without changing any exercise rule.
- [ ] The dashboard leads with current qualifying progress and shows the next departure and fallback availability.
- [ ] The product is visibly Personal Dashboard, with exercise tracking presented as its current feature area.
- [ ] The default week and routine persist in versioned JSON across packaged-app relaunch.
- [ ] The Rust core owns schedule creation, current-week derivation, and reminder intent independently of presentation and platform adapters.
- [ ] A due departure schedules or delivers the established native reminder while the window is closed.
- [ ] No ordinary workflow requires Python, localhost, a browser, network access, an account, or synchronization.
- [ ] One primary application-workflow seam controls time and isolated profile state and asserts visible dashboard state, reminder intent, and persistence.
- [ ] The baseline's first tracer-bullet scenarios are ported by observable behavior rather than HTTP or subprocess implementation.
