import { PRIORITY_LABELS } from "../lib/options";
import type { Priority } from "../types";

export function PriorityBadge({ priority }: { priority: Priority }) {
  return (
    <span className={`badge priority-${priority}`} title={`${PRIORITY_LABELS[priority]} priority`}>
      {PRIORITY_LABELS[priority]}
    </span>
  );
}
