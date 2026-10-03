import { describe, expect, it } from "vitest";
import { DEFAULT_LIST_PARAMS, readListParams, toQueryString } from "./options";

describe("readListParams", () => {
  it("returns defaults for an empty query string", () => {
    expect(readListParams("")).toEqual(DEFAULT_LIST_PARAMS);
  });

  it("reads valid values", () => {
    expect(readListParams("?status=active&search=milk&sort=priority-desc")).toEqual({
      status: "active",
      search: "milk",
      sortBy: "priority",
      order: "desc",
    });
  });

  it("falls back to defaults for invalid values instead of breaking", () => {
    expect(readListParams("?status=nope&sort=hack")).toEqual(DEFAULT_LIST_PARAMS);
  });
});

describe("toQueryString", () => {
  it("is empty for the default state (clean URL)", () => {
    expect(toQueryString(DEFAULT_LIST_PARAMS)).toBe("");
  });

  it("round-trips with readListParams", () => {
    const params = { status: "completed", search: "buy milk", sortBy: "dueDate", order: "asc" } as const;
    expect(readListParams(toQueryString(params))).toEqual(params);
  });
});
