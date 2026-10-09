---
status: accepted
---

# Use a skill-led conversation for Collaboration

Collaboration will present an ongoing personal-management conversation with Codex, with a work history that is expandable and collapsed after completion, and a final reply grounded in independently observed outcomes. We chose this over a persistent shared editing workspace because the user delegates personal-management work through conversation; the application must make Codex's actual work visible rather than require a separate editing workflow.

One Dashboard usage skill package will organize the collaboration-specific guidance and capability descriptions, including personal retro. The application supplies execution, persistence, and presentation, reusing its existing business operations; a skill does not itself register executable tools. No new Personal Dashboard MCP is required. Selected-Vault file access and existing connected MCP tools remain available as needed within their authorized scopes. ADR 0005 continues to govern conversational intent and mechanical execution constraints, including the existing restricted scope of automatic morning planning.

Personal retro belongs to Dashboard use. Workflow retro belongs to developer work in Codex and can inspect retained execution evidence and app code; Dashboard Collaboration is not an app-development environment. The app must retain failures and recovery rather than only the eventual successful result, while unavailable evidence remains unknown. The skill package guides behavior and report content; runtime events and the application determine how progress, available reasoning summaries, tool activity, and replies are displayed.

This iteration must deliver Dashboard-internal usage and the developer-side workflow retro in Codex. The Dashboard usage skill remains reusable rather than defining its purpose around a particular client, but complete Codex Desktop access to Dashboard business capabilities is not a delivery or acceptance requirement for this iteration. Skill reuse requires the calling environment to expose the appropriate executable capabilities; sharing the skill alone does not establish that access.

New ordinary messages queue behind the executing turn. To correct ongoing work immediately, the user stops the current execution and sends a new message; this iteration does not require steering an active turn. Stopping is not rollback: already completed changes retain their observed outcomes, and an in-flight operation whose result is not yet known must remain unconfirmed until reconciled. Conversation history retains the interrupted work and subsequent continuation.

This records the agreed design direction, not implementation or release acceptance.
