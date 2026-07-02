import React, { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Plus, Pencil, Trash2, Clock } from "lucide-react";
import { projectsApi, entriesApi } from "@/lib/api";
import { StatusBadge } from "@/components/StatusBadge";
import { EntryDialog } from "@/components/EntryDialog";
import { ProjectDialog } from "@/components/ProjectDialog";
import { DONE_STATUSES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const fmt = (d) => {
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

export default function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [entryOpen, setEntryOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [projectOpen, setProjectOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const [p, e] = await Promise.all([
        projectsApi.get(id),
        entriesApi.list(id),
      ]);
      setProject(p);
      setEntries(e);
    } catch (err) {
      toast.error("Failed to load project");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const removeEntry = async (entryId) => {
    if (!window.confirm("Delete this entry?")) return;
    try {
      await entriesApi.remove(entryId);
      toast.success("Entry deleted");
      load();
    } catch {
      toast.error("Failed to delete entry");
    }
  };

  const openEditEntry = (entry) => {
    setEditingEntry(entry);
    setEntryOpen(true);
  };
  const openNewEntry = () => {
    setEditingEntry(null);
    setEntryOpen(true);
  };

  const removeProject = async () => {
    if (!window.confirm(`Delete "${project.name}"? All entries are removed.`))
      return;
    try {
      await projectsApi.remove(id);
      toast.success("Project deleted");
      navigate("/");
    } catch {
      toast.error("Failed to delete project");
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-neutral-500 text-sm">Loading…</div>
    );
  }

  if (!project) {
    return (
      <div className="max-w-6xl mx-auto px-6 py-16 text-center">
        <div className="font-display text-2xl font-bold">Project not found</div>
        <Link
          to="/"
          className="text-sm text-neutral-600 underline mt-2 inline-block"
        >
          Back to dashboard
        </Link>
      </div>
    );
  }

  const done = DONE_STATUSES.has(project.status);

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Header */}
      <header className="border-b border-neutral-200 bg-white">
        <div className="max-w-6xl mx-auto px-6 lg:px-12 py-6 flex items-center justify-between">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.15em] text-neutral-600 hover:text-neutral-950"
            data-testid="back-to-dashboard"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Link>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setProjectOpen(true)}
              className="rounded-none border-neutral-300 h-10"
              data-testid="edit-project-btn"
            >
              <Pencil className="w-4 h-4 mr-2" />
              Edit
            </Button>
            <Button
              variant="outline"
              onClick={removeProject}
              className="rounded-none border-neutral-300 h-10 text-red-600 hover:text-red-700 hover:bg-red-50"
              data-testid="delete-project-btn"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 lg:px-12 py-10 space-y-10">
        {/* Project header */}
        <section>
          <div className="flex items-center gap-3 mb-4">
            <StatusBadge status={project.status} />
            {project.client && (
              <span className="text-xs uppercase tracking-[0.15em] text-neutral-500 font-bold">
                {project.client}
              </span>
            )}
          </div>
          <h1
            data-testid="project-title"
            className={cn(
              "font-display text-4xl sm:text-5xl lg:text-6xl font-black tracking-tighter text-neutral-950",
              done &&
                "line-through text-neutral-400 decoration-2 decoration-neutral-300",
            )}
          >
            {project.name}
          </h1>
          {project.description && (
            <p className="mt-4 text-neutral-700 max-w-2xl leading-relaxed">
              {project.description}
            </p>
          )}
        </section>

        {/* Meta grid */}
        <section className="grid grid-cols-2 md:grid-cols-3 bg-white border border-neutral-200">
          <div className="px-6 py-6 border-r border-neutral-200 border-b md:border-b-0">
            <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-neutral-500 mb-1">
              Total Hours
            </div>
            <div
              data-testid="total-hours"
              className="font-display font-mono-num text-3xl font-black text-neutral-950"
            >
              {project.total_hours ?? 0}
              <span className="text-sm text-neutral-500 font-normal ml-1">
                h
              </span>
            </div>
          </div>
          <div className="px-6 py-6 md:border-r border-neutral-200 border-b md:border-b-0">
            <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-neutral-500 mb-1">
              Entries
            </div>
            <div className="font-display font-mono-num text-3xl font-black text-neutral-950">
              {entries.length}
            </div>
          </div>
          <div className="px-6 py-6 col-span-2 md:col-span-1">
            <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-neutral-500 mb-1">
              Deadline
            </div>
            <div className="font-mono-num text-lg text-neutral-800">
              {fmt(project.deadline)}
            </div>
          </div>
        </section>

        {/* Entries */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500 mb-1">
                Time Log
              </div>
              <h2 className="font-display text-2xl font-bold tracking-tight">
                Hours & Work
              </h2>
            </div>
            <Button
              onClick={openNewEntry}
              className="rounded-none bg-neutral-950 hover:bg-neutral-800 h-10"
              data-testid="new-entry-btn"
            >
              <Plus className="w-4 h-4 mr-2" />
              Log hours
            </Button>
          </div>

          <div className="bg-white border border-neutral-200">
            {entries.length === 0 ? (
              <div
                data-testid="entries-empty"
                className="p-14 text-center flex flex-col items-center gap-3"
              >
                <div className="w-12 h-12 border border-neutral-300 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-neutral-400" strokeWidth={1.5} />
                </div>
                <div className="font-display font-bold text-neutral-900">
                  No hours logged yet
                </div>
                <p className="text-sm text-neutral-500 max-w-sm">
                  Add your first entry to start tracking time on this project.
                </p>
                <Button
                  onClick={openNewEntry}
                  variant="outline"
                  className="rounded-none border-neutral-300 mt-2"
                  data-testid="entries-empty-add"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Log first entry
                </Button>
              </div>
            ) : (
              <>
                <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-3 border-b border-neutral-300 bg-neutral-50">
                  <div className="col-span-2 text-[10px] font-bold uppercase tracking-[0.15em] text-neutral-500">
                    Date
                  </div>
                  <div className="col-span-2 text-[10px] font-bold uppercase tracking-[0.15em] text-neutral-500">
                    Hours
                  </div>
                  <div className="col-span-7 text-[10px] font-bold uppercase tracking-[0.15em] text-neutral-500">
                    Description
                  </div>
                  <div className="col-span-1"></div>
                </div>
                {entries.map((e) => (
                  <div
                    key={e.id}
                    data-testid={`entry-row-${e.id}`}
                    className="grid grid-cols-12 gap-4 items-start px-6 py-4 border-b border-neutral-200 last:border-b-0 hover:bg-neutral-50"
                  >
                    <div className="col-span-4 md:col-span-2 font-mono-num text-sm text-neutral-800">
                      {fmt(e.date)}
                    </div>
                    <div className="col-span-4 md:col-span-2 font-mono-num text-base font-bold text-neutral-950">
                      {e.hours}
                      <span className="text-xs text-neutral-500 font-normal ml-1">
                        h
                      </span>
                    </div>
                    <div className="col-span-12 md:col-span-7 text-sm text-neutral-700 leading-relaxed">
                      {e.description || (
                        <span className="text-neutral-400 italic">
                          No description
                        </span>
                      )}
                    </div>
                    <div className="col-span-12 md:col-span-1 flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditEntry(e)}
                        className="rounded-none h-8 w-8"
                        data-testid={`entry-edit-${e.id}`}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeEntry(e.id)}
                        className="rounded-none h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                        data-testid={`entry-delete-${e.id}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </section>
      </main>

      <EntryDialog
        open={entryOpen}
        onOpenChange={setEntryOpen}
        projectId={id}
        entry={editingEntry}
        onSaved={load}
      />
      <ProjectDialog
        open={projectOpen}
        onOpenChange={setProjectOpen}
        project={project}
        onSaved={load}
      />
    </div>
  );
}
