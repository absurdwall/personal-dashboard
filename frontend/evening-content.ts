type EveningContent = Readonly<{
  account: readonly unknown[];
  comparison: readonly unknown[];
  summary: readonly unknown[];
  questions: readonly unknown[];
  additions: readonly unknown[];
  corrections: readonly unknown[];
  other: readonly unknown[];
  recordSupplements: readonly unknown[];
}>;

export function hasEveningReviewContent(evening: EveningContent): boolean {
  return (
    evening.account.length > 0 ||
    evening.comparison.length > 0 ||
    evening.summary.length > 0 ||
    evening.questions.length > 0 ||
    evening.additions.length > 0 ||
    evening.corrections.length > 0 ||
    evening.other.length > 0
  );
}

export function hasEveningVisibleContent(evening: EveningContent): boolean {
  return hasEveningReviewContent(evening) || evening.recordSupplements.length > 0;
}
