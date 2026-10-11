/** Composer discovery for commands supplied by the Dashboard usage skill.
 * /retro already routes through the ordinary message/skill path; completion
 * never runs it. Workflow retro is deliberately a developer-only capability.
 */
export function initializeCollaborationCommandCompletion(
  input: HTMLTextAreaElement,
  menu: HTMLElement,
  description: () => string,
  submit: () => void,
): { close: () => void } {
  let composing = false;
  let dismissed: string | null = null;
  let candidates: readonly string[] = [];
  let selected = 0;
  let tokenEnd = 0;
  menu.setAttribute("role", "listbox");
  input.setAttribute("aria-controls", menu.id);
  input.setAttribute("aria-autocomplete", "list");
  const close = () => {
    candidates = [];
    menu.hidden = true;
    input.setAttribute("aria-expanded", "false");
    input.removeAttribute("aria-activedescendant");
  };
  const complete = () => {
    if (input.disabled || composing) { close(); return; }
    update();
    const command = candidates[selected];
    if (!command) return;
    const prefix = input.value.match(/^\s*/)?.[0] ?? "";
    const suffix = input.value.slice(tokenEnd);
    const space = suffix.startsWith(" ") ? "" : " ";
    input.value = `${prefix}${command}${space}${suffix}`;
    const caret = prefix.length + command.length + space.length;
    close();
    input.focus();
    input.setSelectionRange(caret, caret);
    // Follow the same cache, debounced persistence and rendering path as typing.
    input.dispatchEvent(new Event("input", { bubbles: true }));
  };
  const update = () => {
    const match = input.value.match(/^(\s*)\/(\w*)(?=\s|$)/);
    tokenEnd = match?.[0].length ?? 0;
    if (composing || input.disabled || input.selectionStart !== input.selectionEnd ||
      !match || input.selectionStart < match[1].length + 1 || input.selectionStart > tokenEnd ||
      dismissed === input.value) { close(); return; }
    // This is the only slash command documented in the bundled usage skill.
    candidates = ["/retro"].filter(command => command.startsWith(`/${match[2].toLowerCase()}`));
    if (!candidates.length) { close(); return; }
    selected = Math.min(selected, candidates.length - 1);
    menu.replaceChildren();
    candidates.forEach((command, index) => {
      const option = document.createElement("button");
      option.type = "button";
      option.id = `${menu.id}-${index}`;
      option.setAttribute("role", "option");
      option.setAttribute("aria-selected", String(index === selected));
      option.textContent = `${command} ${description()}`;
      option.addEventListener("mousedown", event => event.preventDefault());
      option.addEventListener("click", () => { selected = index; complete(); });
      menu.append(option);
    });
    menu.hidden = false;
    input.setAttribute("aria-expanded", "true");
    input.setAttribute("aria-activedescendant", `${menu.id}-${selected}`);
  };
  input.addEventListener("input", () => { dismissed = null; selected = 0; update(); });
  input.addEventListener("click", update);
  input.addEventListener("select", update);
  input.addEventListener("keyup", event => {
    if (["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) update();
  });
  input.addEventListener("blur", close);
  input.addEventListener("compositionstart", () => { composing = true; close(); });
  input.addEventListener("compositionend", () => { composing = false; update(); });
  input.addEventListener("keydown", event => {
    if (composing || event.isComposing || event.keyCode === 229) return;
    if (input.disabled) { close(); return; }
    if (!menu.hidden) update();
    if (!menu.hidden) {
      if (event.key === "Escape") {
        event.preventDefault(); dismissed = input.value; close(); return;
      }
      if (event.key === "ArrowUp" || event.key === "ArrowDown") {
        event.preventDefault();
        selected = (selected + (event.key === "ArrowUp" ? -1 : 1) + candidates.length) % candidates.length;
        update(); return;
      }
      if (event.key === "Tab" || event.key === "Enter") {
        event.preventDefault(); complete(); return;
      }
    }
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault(); submit();
    }
  });
  close();
  return { close };
}
