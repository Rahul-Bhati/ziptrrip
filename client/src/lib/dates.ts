/**
 * Date helpers.
 *
 * Due dates are calendar dates ("YYYY-MM-DD"), not moments in time.
 * Trap avoided here: `new Date("2026-10-10")` means MIDNIGHT UTC, which is
 * still Oct 9 in the Americas, so a due date would show one day early there.
 * So we compare the strings directly ("YYYY-MM-DD" sorts like a date) and
 * do day arithmetic in UTC only.
 */

const DAY_MS = 24 * 60 * 60 * 1000;
const pad = (n: number) => String(n).padStart(2, "0");

/** Today as "YYYY-MM-DD" in the user's LOCAL timezone */
export function todayISO(now: Date = new Date()): string {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** "YYYY-MM-DD" → milliseconds at UTC midnight (only used for day arithmetic) */
function toUtcDay(date: string): number {
  const [year = 0, month = 1, day = 1] = date.split("-").map(Number);
  return Date.UTC(year, month - 1, day);
}

/** Whole days from `today` until `dueDate` (negative = in the past) */
export function daysUntil(dueDate: string, today: string = todayISO()): number {
  return Math.round((toUtcDay(dueDate) - toUtcDay(today)) / DAY_MS);
}

export type DueState = "overdue" | "today" | "soon" | "later";

export function getDueState(dueDate: string, today: string = todayISO()): DueState {
  const days = daysUntil(dueDate, today);
  if (days < 0) return "overdue";
  if (days === 0) return "today";
  if (days <= 2) return "soon";
  return "later";
}

/** Human description: "Overdue by 3 days", "Due today", "Due tomorrow", "Due in 5 days" */
export function describeDue(dueDate: string, today: string = todayISO()): string {
  const days = daysUntil(dueDate, today);
  if (days < -1) return `Overdue by ${-days} days`;
  if (days === -1) return "Overdue by 1 day";
  if (days === 0) return "Due today";
  if (days === 1) return "Due tomorrow";
  return `Due in ${days} days`;
}

/** "2026-10-10" → "10 Oct 2026" (in the user's locale, with no timezone shift) */
export function formatDate(date: string): string {
  return new Date(toUtcDay(date)).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** ISO timestamp → local date and time, e.g. "3 Oct 2026, 2:15 pm" */
export function formatDateTime(timestamp: string): string {
  return new Date(timestamp).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

const RELATIVE_UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 365 * 24 * 3600],
  ["month", 30 * 24 * 3600],
  ["week", 7 * 24 * 3600],
  ["day", 24 * 3600],
  ["hour", 3600],
  ["minute", 60],
];

/** ISO timestamp → "5 minutes ago", "yesterday", "2 weeks ago"… (user's locale) */
export function timeAgo(timestamp: string, now: Date = new Date()): string {
  const seconds = Math.round((new Date(timestamp).getTime() - now.getTime()) / 1000);
  const format = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
  for (const [unit, unitSeconds] of RELATIVE_UNITS) {
    if (Math.abs(seconds) >= unitSeconds) return format.format(Math.round(seconds / unitSeconds), unit);
  }
  return "just now";
}
