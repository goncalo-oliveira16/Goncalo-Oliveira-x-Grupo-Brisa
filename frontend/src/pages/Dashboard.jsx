import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Share2, Search, Clock, LayoutGrid } from "lucide-react";
import { projectsApi, statsApi } from "@/lib/api";
import { StatsBar } from "@/components/StatsBar";
import { ProjectRow } from "@/components/ProjectRow";
import { ProjectDialog } from "@/components/ProjectDialog";
import { ShareDialog } from "@/components/ShareDialog";
import { STATUSES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const FILTERS = [
  { value: "all", label: "All" },
  ...STATUSES.map((s) => ({ value: s.value, label: s.label })),
];

export default function Dashboard() {
  const [projects, setProjects] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");

  const load = useCallback(async () => {
    try {
      const [p, s] = await Promise.all([projectsApi.list(), statsApi.get()]);
      setProjects(p);
      setStats(s);
    } catch (err) {
      toast.error("Failed to load data");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    return projects.filter((p) => {
      if (filter !== "all" && p.status !== filter) return false;
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
  }, [projects, filter, query]);

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
              Every hour,
              <br />
              <span className="text-neutral-400">accounted for.</span>
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
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <Input
              data-testid="search-input"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search projects…"
              className="rounded-none border-neutral-300 pl-9 h-10 w-64 bg-white"
            />
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
              Due
            </div>
            <div className="col-span-1"></div>
          </div>

          {loading ? (
            <div className="p-12 text-center text-neutral-500 text-sm">
              Loading…
            </div>
          ) : filtered.length === 0 ? (
            <div
              data-testid="empty-state"
              className="p-16 text-center flex flex-col items-center gap-4"
            >
              <div className="w-14 h-14 border border-neutral-300 flex items-center justify-center">
                <LayoutGrid className="w-6 h-6 text-neutral-400" strokeWidth={1.5} />
              </div>
              <div>
                <div className="font-display text-xl font-bold text-neutral-900">
                  {projects.length === 0
                    ? "No projects yet"
                    : "Nothing matches those filters"}
                </div>
                <p className="text-sm text-neutral-500 mt-1">
                  {projects.length === 0
                    ? "Start by creating your first project."
                    : "Try clearing the search or filter."}
                </p>
              </div>
              {projects.length === 0 && (
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
          ) : (
            <div>
              {filtered.map((p) => (
                <ProjectRow
                  key={p.id}
                  project={p}
                  onChanged={load}
                  onEdit={openEdit}
                />
              ))}
            </div>
          )}
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
