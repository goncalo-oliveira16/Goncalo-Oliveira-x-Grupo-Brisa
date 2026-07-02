import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { shareApi } from "@/lib/api";
import { StatusBadge } from "@/components/StatusBadge";
import { DONE_STATUSES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { Lock, Clock } from "lucide-react";

const fmt = (d) => {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString(undefined, {
      day: "2-digit",
      month: "short",
      year: "2-digit",
    });
  } catch {
    return d;
  }
};

const fmtFull = (d) => {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString(undefined, {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return d;
  }
};

export default function SharedView() {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState({});

  useEffect(() => {
    shareApi
      .getShared(token)
      .then((d) => setData(d))
      .catch(() => setError("This share link is invalid or has been revoked."))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div className="p-16 text-center text-neutral-500 text-sm">Loading…</div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 px-6">
        <div className="max-w-md text-center space-y-4">
          <div className="w-12 h-12 border border-neutral-300 flex items-center justify-center mx-auto">
            <Lock className="w-5 h-5 text-neutral-500" strokeWidth={1.5} />
          </div>
          <h1 className="font-display text-2xl font-bold tracking-tight">
            Link unavailable
          </h1>
          <p className="text-sm text-neutral-600">{error}</p>
        </div>
      </div>
    );
  }

  const projects = data?.projects || [];
  const activeCount = projects.filter(
    (p) => !DONE_STATUSES.has(p.status),
  ).length;
  const deliveredCount = projects.filter((p) =>
    DONE_STATUSES.has(p.status),
  ).length;

  const toggle = (id) => setExpanded((e) => ({ ...e, [id]: !e[id] }));

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Hero */}
      <header className="relative border-b border-neutral-300 bg-white overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-[0.07]"
          style={{
            backgroundImage:
              'url("https://images.pexels.com/photos/14528986/pexels-photo-14528986.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940")',
          }}
        />
        <div className="relative max-w-6xl mx-auto px-6 lg:px-12 py-14">
          <div className="flex items-center gap-2 mb-4">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 border border-neutral-300 text-[10px] font-bold uppercase tracking-[0.18em] text-neutral-700 bg-white">
              <Lock className="w-3 h-3" />
              Read-only report
            </span>
            <span className="text-[10px] uppercase tracking-[0.18em] font-bold text-neutral-500">
              Shared with you
            </span>
          </div>
          <h1
            data-testid="shared-title"
            className="font-display text-4xl sm:text-5xl lg:text-6xl font-black tracking-tighter text-neutral-950 max-w-3xl"
          >
            Gonçalo Oliveira
            <br />
            <span className="text-neutral-400">x Grupo Brisa</span>
          </h1>
          <p className="mt-4 text-sm text-neutral-600 max-w-xl">
            A live view of what&apos;s being worked on, how many hours have gone
            in, and what has been delivered.
          </p>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 lg:px-12 py-10 space-y-8">
        {/* Stats */}
        <section
          data-testid="shared-stats"
          className="grid grid-cols-2 md:grid-cols-4 bg-white border border-neutral-200"
        >
          <Cell
            label="Total Hours"
            value={data.total_hours}
            suffix="hrs"
            testId="shared-total-hours"
          />
          <Cell
            label="Projects"
            value={projects.length}
            testId="shared-total-projects"
          />
          <Cell label="Active" value={activeCount} testId="shared-active" />
          <Cell
            label="Delivered"
            value={deliveredCount}
            testId="shared-delivered"
            last
          />
        </section>

        {/* Projects */}
        <section className="bg-white border border-neutral-200">
          <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-3 border-b border-neutral-300 bg-neutral-50">
            <div className="col-span-6 text-[10px] font-bold uppercase tracking-[0.15em] text-neutral-500">
              Project
            </div>
            <div className="col-span-2 text-[10px] font-bold uppercase tracking-[0.15em] text-neutral-500">
              Status
            </div>
            <div className="col-span-2 text-[10px] font-bold uppercase tracking-[0.15em] text-neutral-500">
              Hours
            </div>
            <div className="col-span-2 text-[10px] font-bold uppercase tracking-[0.15em] text-neutral-500">
              Deadline
            </div>
          </div>

          {projects.length === 0 ? (
            <div className="p-14 text-center text-neutral-500 text-sm">
              No projects to show yet.
            </div>
          ) : (
            projects.map((p) => {
              const done = DONE_STATUSES.has(p.status);
              const isOpen = expanded[p.id];
              return (
                <div key={p.id} className="border-b border-neutral-200 last:border-b-0">
                  <button
                    data-testid={`shared-project-${p.id}`}
                    onClick={() => toggle(p.id)}
                    className={cn(
                      "w-full grid grid-cols-12 gap-4 items-center px-6 py-5 text-left transition-colors",
                      done ? "bg-neutral-50" : "bg-white hover:bg-neutral-50",
                    )}
                  >
                    <div className="col-span-12 md:col-span-6">
                      <div
                        className={cn(
                          "font-display text-lg md:text-xl font-bold tracking-tight text-neutral-950",
                          done &&
                            "line-through text-neutral-400 decoration-2 decoration-neutral-300",
                        )}
                      >
                        {p.name}
                      </div>
                      {p.client && (
                        <div className="text-xs text-neutral-500 mt-0.5">
                          {p.client}
                        </div>
                      )}
                    </div>
                    <div className="col-span-4 md:col-span-2">
                      <StatusBadge status={p.status} />
                    </div>
                    <div className="col-span-4 md:col-span-2 font-mono-num text-lg font-bold text-neutral-950">
                      {p.total_hours ?? 0}
                      <span className="text-xs text-neutral-500 font-normal ml-1">
                        h
                      </span>
                    </div>
                    <div className="col-span-4 md:col-span-2 font-mono-num text-xs text-neutral-700">
                      {fmt(p.deadline)}
                    </div>
                  </button>

                  {isOpen && (
                    <div className="bg-neutral-50 border-t border-neutral-200 px-6 py-5">
                      {p.description && (
                        <p className="text-sm text-neutral-700 mb-4 leading-relaxed max-w-3xl">
                          {p.description}
                        </p>
                      )}
                      <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-neutral-500 mb-2">
                        Time log ({(p.entries || []).length})
                      </div>
                      {(!p.entries || p.entries.length === 0) ? (
                        <div className="text-sm text-neutral-500 italic">
                          No entries logged yet.
                        </div>
                      ) : (
                        <div className="border border-neutral-200 bg-white">
                          {p.entries.map((e) => (
                            <div
                              key={e.id}
                              className="grid grid-cols-12 gap-4 px-4 py-3 border-b border-neutral-200 last:border-b-0"
                            >
                              <div className="col-span-3 font-mono-num text-xs text-neutral-700">
                                {fmtFull(e.date)}
                              </div>
                              <div className="col-span-2 font-mono-num text-sm font-bold">
                                {e.hours}h
                              </div>
                              <div className="col-span-7 text-sm text-neutral-700">
                                {e.description || (
                                  <span className="text-neutral-400 italic">
                                    —
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </section>

        <footer className="pt-4 flex items-center justify-center gap-2 text-[10px] uppercase tracking-[0.2em] text-neutral-400 font-bold">
          <Clock className="w-3 h-3" />
          Hours/Ledger · Read-only
        </footer>
      </main>
    </div>
  );
}

const Cell = ({ label, value, suffix, testId, last }) => (
  <div
    data-testid={testId}
    className={cn(
      "px-6 py-6 border-neutral-200",
      last ? "" : "md:border-r",
      "border-b md:border-b-0",
    )}
  >
    <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-neutral-500 mb-2">
      {label}
    </div>
    <div className="flex items-baseline gap-1.5">
      <span className="font-display font-mono-num text-3xl md:text-4xl font-black tracking-tighter text-neutral-950">
        {value}
      </span>
      {suffix && (
        <span className="text-xs text-neutral-500 font-medium">{suffix}</span>
      )}
    </div>
  </div>
);
