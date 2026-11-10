import type { Person } from "../types";
import { request } from "./client";

/** People for the assignee dropdown. */
export async function listPeople(signal?: AbortSignal): Promise<Person[]> {
  return (await request<{ data: Person[] }>("/people", { signal })).data;
}
