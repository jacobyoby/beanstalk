export type DateSortDirection = "newest" | "oldest";

/** Sort listed recalls by the date the UI already displays (`recallInitiationDate`). */
export function sortRecallsByDate<T extends { recallInitiationDate: string }>(
  recalls: readonly T[],
  direction: DateSortDirection = "newest",
): T[] {
  const sign = direction === "newest" ? -1 : 1;
  return [...recalls].sort((a, b) => sign * a.recallInitiationDate.localeCompare(b.recallInitiationDate));
}
