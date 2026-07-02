import { Circle, CheckSquare, RefreshCw, CheckCircle2 } from "lucide-react";

export const STATUSES = [
  {
    value: "in_progress",
    label: "In Progress",
    short: "Active",
    Icon: Circle,
    className: "bg-slate-100 text-slate-700 border-slate-300",
    dot: "bg-slate-500",
  },
  {
    value: "delivered",
    label: "Delivered",
    short: "Delivered",
    Icon: CheckSquare,
    className: "bg-neutral-950 text-white border-neutral-950",
    dot: "bg-white",
  },
  {
    value: "re_editing",
    label: "Re-editing",
    short: "Re-edit",
    Icon: RefreshCw,
    className: "bg-amber-50 text-amber-900 border-amber-200",
    dot: "bg-amber-600",
  },
  {
    value: "final",
    label: "Final",
    short: "Final",
    Icon: CheckCircle2,
    className: "bg-emerald-50 text-emerald-800 border-emerald-200",
    dot: "bg-emerald-600",
  },
];

export const STATUS_MAP = STATUSES.reduce((acc, s) => {
  acc[s.value] = s;
  return acc;
}, {});

// Projects considered "done" — get strikethrough treatment
export const DONE_STATUSES = new Set(["delivered", "final"]);
