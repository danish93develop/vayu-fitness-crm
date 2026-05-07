import {
  startOfDay,
  endOfDay,
  startOfMonth,
  endOfMonth,
  subMonths,
  addDays,
  format,
  formatDistanceToNow,
  differenceInDays,
} from "date-fns";

export {
  startOfDay,
  endOfDay,
  startOfMonth,
  endOfMonth,
  subMonths,
  addDays,
  format,
  formatDistanceToNow,
  differenceInDays,
};

/** "5 May 2026" */
export function formatDate(d: Date | string): string {
  return format(new Date(d), "d MMM yyyy");
}

/** "5 May, 7:30 AM" */
export function formatDateTime(d: Date | string): string {
  return format(new Date(d), "d MMM, h:mm a");
}

/** "7:30 AM" — clock time only */
export function formatTime(d: Date | string): string {
  return format(new Date(d), "h:mm a");
}

/** "2 days ago", "in 3 days" */
export function relativeTime(d: Date | string): string {
  return formatDistanceToNow(new Date(d), { addSuffix: true });
}

/** Days from today (negative if past). Useful for "expires in X days" */
export function daysFromNow(d: Date | string): number {
  return differenceInDays(new Date(d), new Date());
}

/** Last N months as [start, end, label] tuples — for revenue chart */
export function lastNMonths(n: number) {
  const now = new Date();
  return Array.from({ length: n }, (_, i) => {
    const monthDate = subMonths(now, n - 1 - i);
    return {
      start: startOfMonth(monthDate),
      end: endOfMonth(monthDate),
      label: format(monthDate, "MMM"),
      key: format(monthDate, "yyyy-MM"),
    };
  });
}

/** Greeting that changes by hour */
export function greeting(date = new Date()): string {
  const hour = date.getHours();
  if (hour < 5) return "Working late";
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  if (hour < 21) return "Good evening";
  return "Good night";
}
