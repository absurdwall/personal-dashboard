import { interfaceCopy, setInterfaceCopy, setInterfaceError, type InterfaceCopyKey, type InterfaceLanguage } from "./interface-language.js";
import { createSleepElement } from "./sleep-dom.js";

type Variables = Readonly<Record<string, string | number>>;
export type SleepCopyKey = Extract<InterfaceCopyKey, `sleep.${string}`>;
let language: () => InterfaceLanguage = () => "zh";
export const SLEEP_LANGUAGE_CHANGED_EVENT = "sleep-interface-language-changed";
let renderedLanguage: InterfaceLanguage = "zh";
export function configureSleepLanguage(get: () => InterfaceLanguage): void {
  language = get;
  if (renderedLanguage !== language()) {
    renderedLanguage = language();
    document.dispatchEvent(new Event(SLEEP_LANGUAGE_CHANGED_EVENT));
  }
}
export function sleepLanguage(): InterfaceLanguage { return language(); }
export function sleepText(key: SleepCopyKey, variables: Variables = {}): string { return interfaceCopy(key, language(), variables); }
export function setSleepCopy(node: HTMLElement, key: SleepCopyKey, variables: Variables = {}): void { setInterfaceCopy(node, key, language(), variables); }
export function setSleepError(node: HTMLElement, error: unknown): void { setInterfaceError(node, "sleep.error", String(error), language()); }
export function localizedSleepElement<K extends keyof HTMLElementTagNameMap>(tag: K, parent: HTMLElement, key: SleepCopyKey, variables: Variables = {}): HTMLElementTagNameMap[K] {
  const node = createSleepElement(tag, parent);
  setSleepCopy(node, key, variables);
  return node;
}
export function setSleepAttribute(node: Element, attribute: "aria-label" | "title", key: SleepCopyKey, variables: Variables = {}): void {
  node.setAttribute(`data-i18n-${attribute}`, key);
  if (Object.keys(variables).length) (node as HTMLElement).dataset.i18nVariables = JSON.stringify(variables);
  node.setAttribute(attribute, sleepText(key, variables));
}
