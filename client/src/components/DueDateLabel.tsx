import { describeDue, formatDate, getDueState } from "../lib/dates";

interface Props {
  dueDate: string;
  /** Completed todos show the date only, never as overdue */
  completed: boolean;
}

/** "📅 10 Oct 2026 · Due in 3 days", coloured red when overdue */
export function DueDateLabel({ dueDate, completed }: Props) {
  const state = completed ? "done" : getDueState(dueDate);

  return (
    <span className={`due due-${state}`}>
      <span aria-hidden="true">📅 </span>
      <time dateTime={dueDate}>{formatDate(dueDate)}</time>
      {!completed && <> · {describeDue(dueDate)}</>}
    </span>
  );
}
