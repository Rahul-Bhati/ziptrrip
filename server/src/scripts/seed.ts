import { config } from "../config.js";
import { createDatabase, type DB } from "../db/database.js";
import { ValidationError } from "../errors.js";
import { PersonRepository } from "../repositories/person.repository.js";
import { TodoRepository } from "../repositories/todo.repository.js";
import { PersonService } from "../services/person.service.js";
import { TodoService } from "../services/todo.service.js";
import type { Priority } from "../types/todo.js";

/**
 * Fills the database with sample people and todos so the app has something to show.
 *
 *   npm run seed            → sample todos only if the database has none
 *   npm run seed -- --force → add the sample todos anyway
 *
 * Sample people are inserted whenever they are missing, even if todos already exist.
 * Existing todos are never reassigned.
 *
 * Goes through the services (not raw SQL), so sample data is validated
 * exactly like data coming from the API.
 */

/** "YYYY-MM-DD" for today + `days` (local time), so samples are always relative to now */
function inDays(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

const SAMPLE_PEOPLE = ["Alex", "Jordan", "Priya", "Sam"] as const;

interface Sample {
  title: string;
  description?: string;
  priority: Priority;
  dueDate?: string;
  completed?: boolean;
  assignee?: (typeof SAMPLE_PEOPLE)[number];
}

const samples: Sample[] = [
  { title: "Read the assignment brief", priority: "high", completed: true, assignee: "Alex" },
  {
    title: "Design the REST API",
    description: "CRUD endpoints, status codes, one JSON error format.",
    priority: "high",
    completed: true,
    assignee: "Priya",
  },
  { title: "Write unit and API tests", priority: "high", dueDate: inDays(0), assignee: "Sam" },
  { title: "Build the todo list page", priority: "medium", dueDate: inDays(2), assignee: "Jordan" },
  {
    title: "Build the single todo page",
    description: "Reads ?id= from the URL and shows every detail of one todo.",
    priority: "medium",
    dueDate: inDays(5),
    assignee: "Priya",
  },
  {
    title: "Write README and docs",
    description: "Setup steps, API reference, features, testing guide.\nUndocumented features don't count!",
    priority: "low",
    dueDate: inDays(7),
  },
  { title: "Renew gym membership", priority: "low", dueDate: inDays(-2), assignee: "Alex" },
  { title: "Buy groceries", description: "Milk, eggs, bread, coffee", priority: "medium" },
];

export interface SeedResult {
  peopleAdded: number;
  todosAdded: number;
  /** How many todos are in the database after this run */
  todoCount: number;
}

/** Inserts sample people and, when allowed, sample todos. Safe to call from tests. */
export function runSeed(db: DB, options: { force: boolean }): SeedResult {
  const peopleRepository = new PersonRepository(db);
  const people = new PersonService(peopleRepository);
  const todos = new TodoService(new TodoRepository(db), peopleRepository);

  let peopleAdded = 0;
  for (const name of SAMPLE_PEOPLE) {
    try {
      people.create({ name });
      peopleAdded += 1;
    } catch (error) {
      // Already there (including a different capitalization). Anything else is a real failure.
      if (!(error instanceof ValidationError)) throw error;
    }
  }

  const ids = new Map(people.list().map((person) => [person.name, person.id]));
  const todoCountBefore = todos.list({}).stats.total;

  if (todoCountBefore > 0 && !options.force) {
    return { peopleAdded, todosAdded: 0, todoCount: todoCountBefore };
  }

  for (const { completed = false, assignee, ...input } of samples) {
    const assigneeId = assigneeIdFor(assignee, ids);
    const todo = todos.create({ ...input, assigneeId });
    if (completed) todos.update(String(todo.id), { completed: true });
  }

  return {
    peopleAdded,
    todosAdded: samples.length,
    todoCount: todos.list({}).stats.total,
  };
}

function assigneeIdFor(name: string | undefined, ids: Map<string, number>): number | null {
  if (!name) return null;
  const id = ids.get(name);
  if (id === undefined) throw new Error(`Sample person ${name} was not seeded`);
  return id;
}

const entry = process.argv[1]?.replaceAll("\\", "/");
const isDirectRun = entry?.endsWith("/seed.ts") === true || entry?.endsWith("/seed.js") === true;
if (isDirectRun) {
  const db = createDatabase(config.dbPath);
  const result = runSeed(db, { force: process.argv.includes("--force") });
  if (result.todosAdded === 0) {
    console.log(
      `Database already has ${result.todoCount} todos, no sample todos added. Sample people: ${result.peopleAdded} new.`,
    );
  } else {
    console.log(
      `Added ${result.todosAdded} sample todos to ${config.dbPath}. Sample people: ${result.peopleAdded} new.`,
    );
  }
  db.close();
}
