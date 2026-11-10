import type { Statement } from "better-sqlite3";
import type { DB } from "../db/database.js";
import type { CreatePersonData, Person } from "../types/person.js";

/**
 * Data access for people. This is the only place that runs SQL against `people`.
 */
export class PersonRepository {
  private readonly insertStmt: Statement<[string], Person>;
  private readonly findAllStmt: Statement<[], Person>;
  private readonly findByIdStmt: Statement<[number], Person>;
  private readonly findByNameStmt: Statement<[string], Person>;

  constructor(db: DB) {
    this.insertStmt = db.prepare("INSERT INTO people (name) VALUES (?) RETURNING id, name");
    // COLLATE NOCASE: "priya" and "Priya" sort together, and compare as the same name
    this.findAllStmt = db.prepare("SELECT id, name FROM people ORDER BY name COLLATE NOCASE");
    this.findByIdStmt = db.prepare("SELECT id, name FROM people WHERE id = ?");
    this.findByNameStmt = db.prepare("SELECT id, name FROM people WHERE name = ? COLLATE NOCASE");
  }

  create(data: CreatePersonData): Person {
    const row = this.insertStmt.get(data.name);
    if (!row) throw new Error("Insert did not return a row");
    return row;
  }

  findAll(): Person[] {
    return this.findAllStmt.all();
  }

  findById(id: number): Person | undefined {
    return this.findByIdStmt.get(id);
  }

  /** Case-insensitive. "Priya" and "priya" are the same person. */
  findByName(name: string): Person | undefined {
    return this.findByNameStmt.get(name);
  }
}
