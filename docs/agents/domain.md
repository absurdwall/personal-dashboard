# Domain Docs

Engineering skills should read relevant domain documentation before exploring or changing the project.

## Sources

- Read `CONTEXT.md` when it exists.
- Read relevant ADRs under `docs/adr/` when they exist.
- If these files are absent, proceed without requiring them to be created first.

## Layout

This project uses a single-context layout:

```text
/
├── CONTEXT.md
├── docs/
│   └── adr/
└── src/
```

## Vocabulary

Use terminology defined in `CONTEXT.md`. If a needed concept is missing, either reconsider the term or record the gap for later domain modeling.

## ADR conflicts

Explicitly flag any proposal that conflicts with an existing ADR rather than silently overriding it.
