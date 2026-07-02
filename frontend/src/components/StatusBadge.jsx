import React from "react";
import { STATUS_MAP } from "@/lib/constants";
import { cn } from "@/lib/utils";

export const StatusBadge = ({ status, size = "md" }) => {
  const s = STATUS_MAP[status] || STATUS_MAP.in_progress;
  const Icon = s.Icon;
  return (
    <span
      data-testid={`status-badge-${status}`}
      className={cn(
        "inline-flex items-center gap-1.5 border rounded-full font-bold uppercase tracking-[0.08em]",
        size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-[11px]",
        s.className,
      )}
    >
      <Icon className="w-3 h-3" strokeWidth={2} />
      {s.short}
    </span>
  );
};
