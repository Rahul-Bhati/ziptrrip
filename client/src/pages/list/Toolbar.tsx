import type { ListParams } from "../../api/todos";
import { SORT_CHOICES, STATUS_TABS, sortKey } from "../../lib/options";
import type { TodoStats } from "../../types";

interface Props {
  params: ListParams;
  stats: TodoStats | undefined;
  onChange: (changes: Partial<ListParams>) => void;
}

/** Status tabs (with counts), search box and sort dropdown */
export function Toolbar({ params, stats, onChange }: Props) {
  const countFor = (status: ListParams["status"]) =>
    stats ? { all: stats.total, active: stats.active, completed: stats.completed }[status] : undefined;

  return (
    <div className="toolbar">
      <div className="tabs" role="group" aria-label="Filter by status">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            className={`tab ${params.status === tab.value ? "is-active" : ""}`}
            aria-pressed={params.status === tab.value}
            onClick={() => onChange({ status: tab.value })}
          >
            {tab.label}
            {countFor(tab.value) !== undefined && <span className="tab-count">{countFor(tab.value)}</span>}
          </button>
        ))}
      </div>

      <div className="toolbar-right">
        <input
          type="search"
          className="input"
          placeholder="Search todos…"
          value={params.search}
          onChange={(event) => onChange({ search: event.target.value })}
          aria-label="Search todos"
        />
        <select
          className="input"
          value={sortKey(params)}
          onChange={(event) => {
            const choice = SORT_CHOICES.find((c) => c.value === event.target.value);
            if (choice) onChange({ sortBy: choice.sortBy, order: choice.order });
          }}
          aria-label="Sort todos"
        >
          {SORT_CHOICES.map((choice) => (
            <option key={choice.value} value={choice.value}>
              {choice.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
