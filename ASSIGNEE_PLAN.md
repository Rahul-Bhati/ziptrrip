# Assignee slice — build plan

Implements `ASSIGNEE_SPEC.md` as written. Build one step at a time. Run that step’s test before starting the next one. Stop if the test fails.

Do not commit. Do not push. Wait until you explicitly say to commit.

Each step should leave `npm test` and `npm run typecheck` green for the apps that step touches.

## Step 1 — Database: people table, column, foreign keys

**Build**

- In `server/src/db/schema.ts`, add `people`:
  - `id` integer primary key autoincrement
  - `name` text, trimmed length 1–100
  - a unique index on `name COLLATE NOCASE`
- Export a `migrate(db)` function (called from `createDatabase`) that:
  1. Runs the schema SQL (`CREATE TABLE IF NOT EXISTS` for both tables).
  2. Reads `pragma table_info(todos)`. If `assignee_id` is missing, `ALTER TABLE todos ADD COLUMN assignee_id INTEGER REFERENCES people(id)`.
  3. Runs `PRAGMA foreign_keys = ON` on that connection before returning.
- `createDatabase` stays the only opener. It calls `migrate` and still sets WAL.

`CREATE TABLE IF NOT EXISTS` will not alter the `todos` table already in `server/data/todos.db`. The `table_info` check is what updates that file. Do not delete the database.

**Test**

New file `server/tests/unit/migrate.test.ts`:

- Fresh `createDatabase(":memory:")` has `people`, `todos.assignee_id`, and `foreign_keys` on.
- Upgrade path: open `:memory:`, create the **old** `todos` table (no `assignee_id`, no `people`), call `migrate`, then assert the column exists, `people` exists, and an old-style insert is readable with a null assignee.
- Inserting an `assignee_id` that is not in `people` throws.

```bash
npm test --prefix server -- tests/unit/migrate.test.ts
npm test --prefix server
```

Pass: the new test passes, and the existing server suite still passes. Todos do not return `assignee` yet.

## Step 2 — People API, with no todo changes

**Build**, in this order, matching the todo stack:

1. `server/src/types/person.ts` — `Person { id, name }` and `CreatePersonData { name }`.
2. `server/src/validation/person.schemas.ts` — `createPersonSchema`: strict object, `name` required, trimmed, 1–100. Unknown fields rejected.
3. `server/src/repositories/person.repository.ts` — `create`, `findAll` (order by `name COLLATE NOCASE`), `findById`, `findByName` (case-insensitive). This file is the only new SQL for people.
4. `server/src/services/person.service.ts` — validate, then create. If `findByName` finds a row, throw `ValidationError` with field `name` and a message that the name is already used. Do not rely on the unique index for that message. A race can still hit the index and surface as a `500`; that is acceptable for this slice.
5. `server/src/controllers/person.controller.ts` and `server/src/routes/person.routes.ts` — `GET /` and `POST /`. Same `{ data }` shape as todos.
6. `server/src/app.ts` — `app.use("/api/people", ...)`. Register it beside `/api/todos`. No other route changes.

**Test**

- `server/tests/unit/person.schemas.test.ts` — trim, empty, 101 characters, duplicate is not a schema concern (that is the service), unknown field, non-string.
- `server/tests/unit/person.repository.test.ts` — create, list order ignoring case, find by name ignoring case.
- `server/tests/unit/person.service.test.ts` — duplicate name is a `ValidationError` on `name`.
- `server/tests/api/people.api.test.ts` — `GET` empty list, `POST` 201, `GET` sorted, duplicate `400`, empty name `400`, unknown field `400`.

```bash
npm test --prefix server -- tests/unit/person.schemas.test.ts tests/unit/person.repository.test.ts tests/unit/person.service.test.ts tests/api/people.api.test.ts
npm test --prefix server
```

Pass: people endpoints work. Todo responses are unchanged.

## Step 3 — Assignee on todos

Do this as one step. Splitting the type from the repository leaves `npm run typecheck` red in the middle.

**Build**

1. `server/src/types/todo.ts`
   - `Todo.assignee: { id: number; name: string } | null`
   - `CreateTodoData.assigneeId: number | null` (required here, same as `dueDate`; the schema applies the default)
   - `UpdateTodoData` includes optional `assigneeId: number | null`, where `null` clears and a missing field means “leave it”
2. `server/src/validation/todo.schemas.ts`
   - Create: `assigneeId` optional, default `null`. Accept `null` or a positive integer (`^[1-9]\d*$` after accepting a number). Reject `0`, fractions, numeric strings, and booleans.
   - Update: same field, optional, no default.
3. `server/src/repositories/todo.repository.ts`
   - `LEFT JOIN people` on list and get-one.
   - Map a missing person to `assignee: null`.
   - Insert and update write `assignee_id`.
   - Add `assigneeId` → `assignee_id` to the update allow-list.
4. `server/src/services/todo.service.ts`
   - Take a `PersonRepository` as a second constructor argument.
   - After schema parsing, if `assigneeId` is a number and `findById` misses, throw `ValidationError` with field `assigneeId` and message `assigneeId must be the id of an existing person, or null`.
   - `null` and `undefined` skip that check.
5. `server/src/app.ts` and `server/tests/helpers.ts` — construct `PersonRepository` on the same database and pass it into `TodoService`.

**Update existing tests in this same step**

- `server/tests/unit/todo.repository.test.ts` — add `assigneeId: null` to the `todo()` helper. Assert `assignee: null` on create. Add cases: create with a real person, update to another person, update with `null` clears, omitted field leaves the person in place.
- `server/tests/unit/todo.schemas.test.ts` — create output now includes `assigneeId: null`. Add reject cases for a bad id.
- `server/tests/unit/todo.service.test.ts` — unknown `assigneeId` throws `ValidationError`. Create and update with a real id succeed.
- `server/tests/api/todos.api.test.ts` — most body checks use `toMatchObject`, so an extra `assignee` field will not fail them. Add API cases: omit and `null` store unassigned; a real id returns `assignee`; an unknown id is `400` on `assigneeId`; `PATCH` with `null` clears; `PATCH` that omits `assigneeId` keeps the person. Any `toEqual` on a full todo must include `assignee`.

```bash
npm test --prefix server
npm run typecheck --prefix server
```

Pass: both commands are green. A created todo with no assignee has `"assignee": null`.

## Step 4 — Seed

**Build**

`server/src/scripts/seed.ts` currently runs on import, which a test cannot call safely. Move the body into an exported `runSeed(db, options: { force: boolean })` that uses `PersonService` and `TodoService`. The script file only opens `config.dbPath`, calls `runSeed`, and closes.

Behavior:

- Ensure Alex, Jordan, Priya, and Sam exist (insert only missing names).
- Do this even when todos already exist.
- Insert the eight sample todos only when there are zero todos, or when `force` is true. Same rule as now.
- Assign those new sample todos as in the spec table. Leave “Write README and docs” and “Buy groceries” unassigned.
- Never update the assignee on a todo that was already in the database.

**Test**

`server/tests/unit/seed.test.ts`, on `:memory:` only. Do not point it at `server/data/todos.db`.

- Empty database: 4 people, 8 todos, the two unassigned titles have `assignee: null`, “Design the REST API” is Priya.
- Database that already has one todo: running without `force` adds the 4 people, leaves the todo count at 1, and leaves that todo’s assignee null.
- Second run without `force` does not duplicate people.

```bash
npm test --prefix server -- tests/unit/seed.test.ts
npm test --prefix server
```

Manual check, after the server tests pass. Stop the dev server first so it is not holding the file:

```bash
npm run seed
```

On a database that already has todos, the log should say people were ensured and the sample todos were not added again. Start the server and `GET /api/people` should list the four names.

## Step 5 — Client types, API, and the edit diff

No screen changes yet.

**Build**

- `client/src/types.ts` — re-export `Person` if the UI needs it. Add `assigneeId?: number | null` to `NewTodo`. Add `assigneeId?: number | null` to `TodoChanges`. Do not derive that field from `Todo.assignee`, because the response object and the request id are different.
- `client/src/api/people.ts` — `listPeople()`.
- `client/src/lib/changes.ts` — draft stores `assigneeId` as `number | ""` (empty means Unassigned, same trick as the date input). `toDraft` uses `todo.assignee?.id ?? ""`. `getChanges` sends `assigneeId: null` when cleared, the number when changed, and omits it when unchanged.

**Test**

Extend `client/src/lib/changes.test.ts`:

- Unassigned todo, dropdown left alone → no `assigneeId` in the patch.
- Unassigned → person 2 → `{ assigneeId: 2 }`.
- Person 2 → Unassigned → `{ assigneeId: null }`.
- Person 2 → person 2 → field omitted.

```bash
npm test --prefix client
npm run typecheck --prefix client
```

Pass: both green. The UI still does not show a dropdown. Typecheck will fail until the draft includes `assigneeId`, so finish `changes.ts` and its tests together.

## Step 6 — List page: dropdown and name on the row

**Build**

- `client/src/pages/list/useTodoList.ts` — load `listPeople()` once, in parallel with the todos is fine as a separate request. Expose `people`, `peopleError`, and a reload that refreshes both after create (a new todo does not add a person, so reloading people is optional; reloading todos stays required).
- `client/src/pages/list/AddTodoForm.tsx` — Assignee `<select>` in the options row, next to Priority and Due date. First option value `""`, label `Unassigned`, and that is the initial state. Other options are `person.id` / `person.name`. Submit sends `assigneeId: null` or the number. Reset to Unassigned after success. If `people` is empty, show only Unassigned and the text “No people yet”. If loading people failed, show that error and still allow Unassigned.
- `client/src/pages/list/TodoItem.tsx` — next to the priority badge, show `todo.assignee.name`, or the muted word `Unassigned`.
- Pass `people` from `ListPage` into the form.

There is no component test runner. Do not add one.

**Test**

```bash
npm run typecheck --prefix client
npm run dev
```

In the browser at http://localhost:5173:

- Dropdown lists Unassigned, then Alex, Jordan, Priya, Sam.
- Add a todo with Priya. The new row shows Priya. The dropdown is back on Unassigned.
- Add a todo left on Unassigned. The row shows Unassigned.
- Existing filters, search, sort, complete, inline title edit, and delete still work.
- Keyboard: the select is reachable by Tab and has the visible label “Assignee”.

## Step 7 — Detail page: show, change, clear

**Build**

- `client/src/pages/todo/TodoDetails.tsx` — an Assignee fact. Name, or Unassigned.
- `client/src/pages/todo/TodoPage.tsx` — load `listPeople()` with the todo. Pass the list into the edit form.
- `client/src/pages/todo/EditTodoForm.tsx` — the same select. Include `assigneeId` in the field-error list so a server error renders under the select. Saving with no edits still sends nothing. The existing unsaved-changes warning follows `getChanges`, so it covers this field once the draft does.

**Test**

With `npm run dev` still running:

- Open an assigned todo. The page shows the name. Edit, switch to someone else, save. The page shows the new name. Reload and it is still the new name.
- Edit, choose Unassigned, save. The page shows Unassigned.
- Open the editor and save without touching Assignee. The network panel shows a PATCH body with no `assigneeId` (or no request at all, if nothing else changed).
- Change the assignee, then click the back link. The browser asks you to leave.
- A bookmarked `todo.html?id=` for an old todo still loads, with Unassigned.

```bash
npm test
npm run typecheck
```

## Step 8 — Docs

Update only the lines this feature adds:

- `README.md` data model: `people`, and `assignee` on the todo.
- `docs/API.md`: `GET /api/people`, `POST /api/people`, `assignee` on the todo object, `assigneeId` on create and update, and the `400` for an unknown id.
- `docs/FEATURES.md`: the dropdown, the list label, the detail fact, and edit/clear.

Do not document filter, sort, or a people-management screen.

**Test**

Read the three sections against one real response from `GET /api/todos/1` and `GET /api/people`. The field names in the docs match the JSON.

## Step 9 — Full check, then stop

```bash
npm test
npm run typecheck
```

Then one pass on the real file, dev server running:

- Old todos are still there and show Unassigned.
- `GET /api/people` returns the four names.
- Create, show, edit, and clear all work from the UI.
- All / Active / Completed, search, and sort still behave as before.

Stop there. Do not commit.

## If a step fails

Fix that step and re-run its test. Do not start the next step on a red suite, and do not commit a partial fix.
