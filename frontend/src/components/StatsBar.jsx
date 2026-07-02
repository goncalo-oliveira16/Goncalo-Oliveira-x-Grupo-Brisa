import React from "react";

const Cell = ({ label, value, subtle, testId, last }) => (
  <div
    data-testid={testId}
    className={`px-6 py-6 lg:py-8 flex flex-col gap-2 border-neutral-200 ${
      last ? "" : "md:border-r"
    } border-b md:border-b-0`}
  >
    <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-neutral-500">
      {label}
    </span>
    <div className="flex items-baseline gap-2">
      <span className="font-display text-3xl md:text-4xl font-black tracking-tighter text-neutral-950 font-mono-num">
        {value}
      </span>
      {subtle && (
        <span className="text-xs text-neutral-500 font-medium">{subtle}</span>
      )}
    </div>
  </div>
);

export const StatsBar = ({ stats }) => {
  if (!stats) return null;
  return (
    <div
      data-testid="stats-bar"
      className="grid grid-cols-1 md:grid-cols-2 bg-white border border-neutral-200"
    >
      <Cell
        testId="stat-total-hours"
        label="Total Hours"
        value={stats.total_hours ?? 0}
        subtle="hrs"
      />
      <Cell
        testId="stat-active"
        label="Active Projects"
        value={stats.active ?? 0}
        subtle={`/ ${stats.total_projects ?? 0} total`}
        last
      />
    </div>
  );
};
