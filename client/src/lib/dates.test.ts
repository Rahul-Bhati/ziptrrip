import { describe, expect, it } from "vitest";
import { daysUntil, describeDue, getDueState, todayISO } from "./dates";

describe("todayISO", () => {
  it("uses the LOCAL calendar date, zero-padded", () => {
    // Month is 0-based in the Date constructor: 0 = January
    expect(todayISO(new Date(2026, 0, 5, 23, 59))).toBe("2026-01-05");
  });
});

describe("daysUntil", () => {
  it.each([
    ["2026-10-03", "2026-10-03", 0],
    ["2026-10-04", "2026-10-03", 1],
    ["2026-10-01", "2026-10-03", -2],
    ["2027-01-01", "2026-12-31", 1], // across a year boundary
    ["2026-03-30", "2026-03-28", 2], // across a daylight-saving change in many timezones
  ])("from %s to %s is %i days", (due, today, expected) => {
    expect(daysUntil(due, today)).toBe(expected);
  });
});

describe("getDueState / describeDue", () => {
  const today = "2026-10-03";

  it.each([
    ["2026-09-30", "overdue", "Overdue by 3 days"],
    ["2026-10-02", "overdue", "Overdue by 1 day"],
    ["2026-10-03", "today", "Due today"],
    ["2026-10-04", "soon", "Due tomorrow"],
    ["2026-10-05", "soon", "Due in 2 days"],
    ["2026-10-20", "later", "Due in 17 days"],
  ])("%s → %s, %j", (due, state, text) => {
    expect(getDueState(due, today)).toBe(state);
    expect(describeDue(due, today)).toBe(text);
  });
});
