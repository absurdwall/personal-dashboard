# Fixed interface language

Fixed Personal Dashboard copy lives in `frontend/interface-language.ts`. Add
both `zh` and `en` values to `interfaceCopies` in the same feature slice that
introduces a new label, button, status, setting, or fixed error.

- Static HTML uses `data-i18n`, `data-i18n-aria-label`,
  `data-i18n-title`, or `data-i18n-placeholder` with a catalog key.
- Dynamic fixed copy uses `setInterfaceCopy`; fixed application messages use
  `setApplicationMessage` so an already-rendered status can switch language.
- Fixed error wrappers use `setInterfaceError`, which retains the original
  diagnostic separately while localizing the user-visible detail.
- Never pass standalone Daily Record Markdown, task text, habit names, source
  labels, or other user-owned content through catalog or error translation.
  Such content may be interpolated unchanged into a fixed label.
- Composite backend projections expose tagged fixed-grammar fields separately
  from source-owned fields. Translate only the tagged status, evidence, and
  relation values; interpolate source labels, notes, and record text verbatim.
- Keep fixed backend diagnostics in the paired error catalog or a narrowly
  matched diagnostic formatter. Preserve dynamic paths, keys, and operating
  system details as uninterpreted values.
- Language is a Mac-local preference and is independent of Vault data and
  appearance reset.
