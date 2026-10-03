import { config } from "../config.js";
import { createDatabase } from "../db/database.js";
import { TodoRepository } from "../repositories/todo.repository.js";
import { TodoService } from "../services/todo.service.js";
import type { Priority } from "../types/todo.js";

/**
 * Fills the database with sample todos so the app has something to show.
 *
 *   npm run seed            → only if the database is empty
 *   npm run seed -- --force → add the samples anyway
 *
 * Goes through TodoService (not raw SQL), so sample data is validated
 * exactly like data coming from the API.
 */

/** "YYYY-MM-DD" for today + `days` (local time), so samples are always relative to now */
function inDays(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

interface Sample {
  title: string;
  description?: string;
  priority: Priority;
  dueDate?: string;
  completed?: boolean;
}

const samples: Sample[] = [
  { title: "Read the assignment brief", priority: "high", completed: true },
  {
    title: "Design the REST API",
    description: "CRUD endpoints, status codes, one JSON error format.",
    priority: "high",
    completed: true,
  },
  { title: "Write unit and API tests", priority: "high", dueDate: inDays(0) },
  { title: "Build the todo list page", priority: "medium", dueDate: inDays(2) },
  {
    title: "Build the single todo page",
    description: "Reads ?id= from the URL and shows every detail of one todo.",
    priority: "medium",
    dueDate: inDays(5),
  },
  {
    title: "Write README and docs",
    description: "Setup steps, API reference, features, testing guide.\nUndocumented features don't count!",
    priority: "low",
    dueDate: inDays(7),
  },
  { title: "Renew gym membership", priority: "low", dueDate: inDays(-2) },
  { title: "Buy groceries", description: "Milk, eggs, bread, coffee", priority: "medium" },
];

const db = createDatabase(config.dbPath);
const service = new TodoService(new TodoRepository(db));
const { total } = service.list({}).stats;

if (total > 0 && !process.argv.includes("--force")) {
  console.log(`Database already has ${total} todos, nothing added (use "npm run seed -- --force" to add anyway).`);
} else {
  for (const { completed = false, ...input } of samples) {
    const todo = service.create(input);
    if (completed) service.update(String(todo.id), { completed: true });
  }
  console.log(`Added ${samples.length} sample todos to ${config.dbPath}`);
}

db.close();
