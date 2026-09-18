export type HabitDisplayLanguage = "zh" | "en";

export type HabitLocalizedNames = Readonly<{
  zh: string | null;
  en: string | null;
}>;

export function localizedHabitName(
  sourceName: string,
  localizedNames: HabitLocalizedNames | null | undefined,
  language: HabitDisplayLanguage,
): string {
  const localized = localizedNames?.[language];
  return localized?.trim() ? localized : sourceName;
}
