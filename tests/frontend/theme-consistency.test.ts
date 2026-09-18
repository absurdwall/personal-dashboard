import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const styles = readFileSync(
  new URL("../../frontend/styles.css", import.meta.url),
  "utf8",
);

test("the theme role cascade keeps task actions and destinations on selected palette tokens", () => {
  const roleSection = styles.slice(styles.lastIndexOf("Personal Dashboard 3.0.1"));

  assert.ok(roleSection.length > 0, "missing 3.0.1 theme role section");
  assert.match(roleSection, /#task-new[\s\S]*background:\s*var\(--parity-accent-strong\)/);
  assert.match(roleSection, /#task-new[\s\S]*color:\s*var\(--parity-accent-on\)/);
  assert.match(roleSection, /\.tasks-refresh-button[\s\S]*background:\s*var\(--parity-surface-soft\)/);
  assert.match(roleSection, /\.tasks-refresh-button[\s\S]*color:\s*var\(--parity-ink\)/);
  assert.match(roleSection, /#choose-background-image[\s\S]*background:\s*var\(--parity-accent-strong\)/);
  assert.match(roleSection, /#refresh-habits[\s\S]*background:\s*var\(--parity-surface\)/);
  assert.match(roleSection, /#task-new:disabled[\s\S]*opacity:\s*0\.55/);
  assert.match(roleSection, /\.destination-button\[aria-current="page"\][\s\S]*background:\s*var\(--parity-accent-soft\)/);
  assert.match(roleSection, /:focus-visible[\s\S]*outline(?:-color)?:[\s\S]*var\(--parity-focus\)/);
  assert.match(roleSection, /button\.habit-cell:focus-visible[\s\S]*outline:\s*2px solid var\(--parity-focus\)/);
  assert.match(roleSection, /\.accent-swatches button\[aria-pressed="true"\][\s\S]*outline:\s*2px solid var\(--parity-focus\)/);
  assert.doesNotMatch(roleSection, /#214c37|#e0ebe5|#183e34|#87a995/);
  assert.match(styles, /button\s*\{[\s\S]*background:\s*var\(--parity-accent-strong\)[\s\S]*color:\s*var\(--parity-accent-on\)/);
});
