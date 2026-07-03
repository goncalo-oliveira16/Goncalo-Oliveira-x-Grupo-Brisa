import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Share2, Search, Clock, LayoutGrid, Calendar, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { projectsApi, statsApi } from "@/lib/api";
import { StatsBar } from "@/components/StatsBar";
import { ProjectRow } from "@/components/ProjectRow";
import { ProjectDialog } from "@/components/ProjectDialog";
import { ShareDialog } from "@/components/ShareDialog";
import { STATUSES } from "@/lib/constants";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const FILTERS = [
  { value: "all", label: "All" },
  ...STATUSES.map((s) => ({ value: s.value, label: s.label })),
];

const MONTH_LABELS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

// Return the reference date used for month/year bucketing:
// prefer deadline, fall back to created_at.
const projectRefDate = (p) => {
  const raw = p.deadline || p.created_at;
  if (!raw) return null;
  const d = new Date(raw);
  return isNaN(d.getTime()) ? null : d;
};

export default function Dashboard() {
  const [projects, setProjects] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [filter, setFilter] = useState("all");
  const [monthFilter, setMonthFilter] = useState("all");
  const [yearFilter, setYearFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [deadlineSort, setDeadlineSort] = useState(null); // null | "desc" | "asc"

  const cycleDeadlineSort = () => {
    setDeadlineSort((s) => {
      if (s === null) return "desc";
      if (s === "desc") return "asc";
      return null;
    });
  };

  const load = useCallback(async () => {
    try {
      const [p, s] = await Promise.all([projectsApi.list(), statsApi.get()]);
      setProjects(p);
      setStats(s);
    } catch (err) {
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const yearOptions = useMemo(() => {
    // Always start from 2025 and go through the current year (or later if a
    // project has a deadline in a future year).
    const years = new Set();
    const nowYear = new Date().getFullYear();
    const maxProjectYear = projects.reduce((max, p) => {
      const d = projectRefDate(p);
      return d && d.getFullYear() > max ? d.getFullYear() : max;
    }, 0);
    const endYear = Math.max(nowYear, maxProjectYear, 2025);
    for (let y = 2025; y <= endYear; y++) years.add(y);
    // Include any earlier years that actually have projects, just in case.
    for (const p of projects) {
      const d = projectRefDate(p);
      if (d) years.add(d.getFullYear());
    }
    return Array.from(years).sort((a, b) => a - b);
  }, [projects]);

  const monthOptions = useMemo(() => {
    // Always show all 12 months in calendar order, regardless of whether
    // projects exist in that month yet.
    return MONTH_LABELS.map((label, idx) => ({
      value: String(idx),
      label,
    }));
  }, []);

  const filtered = useMemo(() => {
    return projects.filter((p) => {
      if (filter !== "all" && p.status !== filter) return false;
      if (yearFilter !== "all" || monthFilter !== "all") {
        const d = projectRefDate(p);
        if (!d) return false;
        if (yearFilter !== "all" && d.getFullYear() !== Number(yearFilter))
          return false;
        if (monthFilter !== "all" && d.getMonth() !== Number(monthFilter))
          return false;
      }
      if (query.trim()) {
        const q = query.toLowerCase();
        return (
          p.name.toLowerCase().includes(q) ||
          (p.client || "").toLowerCase().includes(q) ||
          (p.description || "").toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [projects, filter, monthFilter, yearFilter, query]);

  const displayed = useMemo(() => {
    if (deadlineSort === null) return filtered;
    // Sort by deadline (falls back to created_at via projectRefDate).
    // Projects without any date always go to the bottom.
    const withDate = [];
    const withoutDate = [];
    for (const p of filtered) {
      const raw = p.deadline;
      const d = raw ? new Date(raw) : null;
      if (d && !isNaN(d.getTime())) withDate.push({ p, t: d.getTime() });
      else withoutDate.push(p);
    }
    withDate.sort((a, b) =>
      deadlineSort === "desc" ? b.t - a.t : a.t - b.t,
    );
    return [...withDate.map((x) => x.p), ...withoutDate];
  }, [filtered, deadlineSort]);

  const openNew = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const openEdit = (p) => {
    setEditing(p);
    setDialogOpen(true);
  };

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Header */}
      <header className="border-b border-neutral-200 bg-white">
        <div className="max-w-6xl mx-auto px-6 lg:px-12 py-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-neutral-950 flex items-center justify-center">
              <Clock className="w-4 h-4 text-white" strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="font-display text-lg font-black tracking-tight text-neutral-950">
                HOURS<span className="text-neutral-400">/</span>LEDGER
              </h1>
              <p className="text-[10px] uppercase tracking-[0.2em] text-neutral-500 font-bold">
                Project Time Tracker
              </p>
            </div>
          </div>

          <Button
            data-testid="share-btn"
            onClick={() => setShareOpen(true)}
            variant="outline"
            className="rounded-none border-neutral-300 hover:bg-neutral-100 h-10 font-medium"
          >
            <Share2 className="w-4 h-4 mr-2" />
            Share with boss
          </Button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 lg:px-12 py-10 space-y-8">
        {/* Title block */}
        <section className="flex items-end justify-between flex-wrap gap-4">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500 mb-2">
              Dashboard
            </div>
            <h2
              data-testid="dashboard-title"
              className="font-display text-4xl sm:text-5xl lg:text-6xl font-black tracking-tighter text-neutral-950"
            >
              Gonçalo Oliveira
              <br />
              <span className="text-neutral-400">x Grupo Brisa</span>
            </h2>
          </div>
          <Button
            data-testid="new-project-btn"
            onClick={openNew}
            className="rounded-none bg-neutral-950 hover:bg-neutral-800 h-11 px-6"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Project
          </Button>
        </section>

        {/* Stats */}
        <StatsBar stats={stats} />

        {/* Filters + search */}
        <section className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-1 flex-wrap">
            {FILTERS.map((f) => (
              <button
                key={f.value}
                data-testid={`filter-${f.value}`}
                onClick={() => setFilter(f.value)}
                className={cn(
                  "px-3 py-1.5 text-xs font-bold uppercase tracking-[0.1em] border transition-colors",
                  filter === f.value
                    ? "bg-neutral-950 text-white border-neutral-950"
                    : "bg-white text-neutral-700 border-neutral-300 hover:bg-neutral-100",
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Select value={yearFilter} onValueChange={(v) => { setYearFilter(v); setMonthFilter("all"); }}>
              <SelectTrigger
                data-testid="year-filter"
                className="rounded-none border-neutral-300 h-10 w-[130px] bg-white text-xs font-bold uppercase tracking-[0.1em]"
              >
                <Calendar className="w-3.5 h-3.5 mr-1.5 text-neutral-500" />
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent className="rounded-none">
                <SelectItem value="all" data-testid="year-filter-all">
                  All Years
                </SelectItem>
                {yearOptions.map((y) => (
                  <SelectItem
                    key={y}
                    value={String(y)}
                    data-testid={`year-filter-${y}`}
                  >
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={monthFilter} onValueChange={setMonthFilter}>
              <SelectTrigger
                data-testid="month-filter"
                className="rounded-none border-neutral-300 h-10 w-[140px] bg-white text-xs font-bold uppercase tracking-[0.1em]"
              >
                <SelectValue placeholder="Month" />
              </SelectTrigger>
              <SelectContent className="rounded-none">
                <SelectItem value="all" data-testid="month-filter-all">
                  All Months
                </SelectItem>
                {monthOptions.map((m) => (
                  <SelectItem
                    key={m.value}
                    value={m.value}
                    data-testid={`month-filter-${m.value}`}
                  >
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
              <Input
                data-testid="search-input"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search projects…"
                className="rounded-none border-neutral-300 pl-9 h-10 w-56 bg-white"
              />
            </div>
          </div>
        </section>

        {/* Projects list */}
        <section className="bg-white border border-neutral-200">
          {/* Column headers */}
          <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-3 border-b border-neutral-300 bg-neutral-50">
            <div className="col-span-1"></div>
            <div className="col-span-5 text-[10px] font-bold uppercase tracking-[0.15em] text-neutral-500">
              Project
            </div>
            <div className="col-span-2 text-[10px] font-bold uppercase tracking-[0.15em] text-neutral-500">
              Status
            </div>
            <div className="col-span-2 text-[10px] font-bold uppercase tracking-[0.15em] text-neutral-500">
              Hours
            </div>
            <div className="col-span-1 text-[10px] font-bold uppercase tracking-[0.15em] text-neutral-500">
              <button
                type="button"
                data-testid="deadline-sort-btn"
                onClick={cycleDeadlineSort}
                title={
                  deadlineSort === "desc"
                    ? "Sorted: newest first (click for oldest first)"
                    : deadlineSort === "asc"
                      ? "Sorted: oldest first (click to clear)"
                      : "Click to sort by deadline"
                }
                className={cn(
                  "inline-flex items-center gap-1 uppercase tracking-[0.15em] transition-colors",
                  deadlineSort
                    ? "text-neutral-950"
                    : "text-neutral-500 hover:text-neutral-950",
                )}
              >
                Deadline
                {deadlineSort === "desc" && (
                  <ArrowDown className="w-3 h-3" strokeWidth={2.5} />
                )}
                {deadlineSort === "asc" && (
                  <ArrowUp className="w-3 h-3" strokeWidth={2.5} />
                )}
                {deadlineSort === null && (
                  <ArrowUpDown className="w-3 h-3 opacity-50" strokeWidth={2} />
                )}
              </button>
            </div>
            <div className="col-span-1"></div>
          </div>

          {(() => {
            if (loading) {
              return (
                <div className="p-12 text-center text-neutral-500 text-sm">
                  Loading…
                </div>
              );
            }
            if (displayed.length === 0) {
              const isEmpty = projects.length === 0;
              return (
                <div
                  data-testid="empty-state"
                  className="p-16 text-center flex flex-col items-center gap-4"
                >
                  <div className="w-14 h-14 border border-neutral-300 flex items-center justify-center">
                    <LayoutGrid className="w-6 h-6 text-neutral-400" strokeWidth={1.5} />
                  </div>
                  <div>
                    <div className="font-display text-xl font-bold text-neutral-900">
                      {isEmpty ? "No projects yet" : "Nothing matches those filters"}
                    </div>
                    <p className="text-sm text-neutral-500 mt-1">
                      {isEmpty
                        ? "Start by creating your first project."
                        : "Try clearing the search or filter."}
                    </p>
                  </div>
                  {isEmpty && (
                    <Button
                      onClick={openNew}
                      className="rounded-none bg-neutral-950 hover:bg-neutral-800 mt-2"
                      data-testid="empty-new-project-btn"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Create project
                    </Button>
                  )}
                </div>
              );
            }
            return (
              <div>
                {displayed.map((p) => (
                  <ProjectRow
                    key={p.id}
                    project={p}
                    onChanged={load}
                    onEdit={openEdit}
                  />
                ))}
              </div>
            );
          })()}
        </section>

        <footer className="pt-6 text-[10px] uppercase tracking-[0.2em] text-neutral-400 font-bold text-center">
          Hours/Ledger · v1.0
        </footer>
      </main>

      <ProjectDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        project={editing}
        onSaved={load}
      />
      <ShareDialog open={shareOpen} onOpenChange={setShareOpen} />
    </div>
  );
}
