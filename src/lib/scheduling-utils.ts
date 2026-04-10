import { addDays, format, isAfter, parseISO, startOfDay } from "date-fns";

/**
 * Calculates the next occurrence of a task based on a bespoke set of days.
 * @param currentDate The date when the current instance was completed/due.
 * @param daysOfWeek Array of numbers (0-6, where 0 is Sunday).
 * @param endDate Optional end date after which no more instances should be created.
 * @returns Next due date as 'yyyy-MM-dd' string, or null if beyond end date.
 */
export function getNextBespokeOccurrence(currentDate: string | Date, daysOfWeek: number[], endDate?: string): string | null {
  if (!daysOfWeek || daysOfWeek.length === 0) return null;

  const start = startOfDay(typeof currentDate === 'string' ? parseISO(currentDate) : currentDate);
  const end = endDate ? startOfDay(parseISO(endDate)) : null;

  // We want to find the next day in the set, starting from the day AFTER currentDate
  let candidate = addDays(start, 1);
  
  // Maximum search range to prevent infinite loops (e.g., 2 years)
  const maxSearch = addDays(start, 730);

  while (!isAfter(candidate, maxSearch)) {
    if (daysOfWeek.includes(candidate.getDay())) {
      // Found the next day
      if (end && isAfter(candidate, end)) {
        return null; // Beyond end date
      }
      return format(candidate, 'yyyy-MM-dd');
    }
    candidate = addDays(candidate, 1);
  }

  return null;
}
