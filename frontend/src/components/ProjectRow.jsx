import React from "react";
import { Link } from "react-router-dom";
import { StatusBadge } from "./StatusBadge";
import { DONE_STATUSES, STATUSES } from "@/lib/constants";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Pencil, Trash2, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { projectsApi } from "@/lib/api";
import { toast } from "sonner";

const fmtDeadline = (d) => {
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

export const ProjectRow = ({ project, onChanged, onEdit }) => {
  const done = DONE_STATUSES.has(project.status);

  // Checkbox toggles between "final" (done) and "in_progress" (active).
  const toggleDone = async (checked) => {
    const newStatus = checked ? "final" : "in_progress";
    try {
      await projectsApi.update(project.id, { status: newStatus });
      toast.success(checked ? "Marked as final" : "Reopened project");
      onChanged?.();
    } catch {
      toast.error("Failed to update");
    }
  };

  const setStatus = async (status) => {
    try {
      await projectsApi.update(project.id, { status });
      toast.success("Status updated");
      onChanged?.();
    } catch {
      toast.error("Failed to update");
    }
  };

  const remove = async () => {
    if (!window.confirm(`Delete "${project.name}"? This also removes all logged hours.`))
      return;
    try {
      await projectsApi.remove(project.id);
      toast.success("Project deleted");
      onChanged?.();
    } catch {
      toast.error("Failed to delete");
    }
  };

  return (
    <div
      data-testid={`project-row-${project.status}`}
      data-testid-project={`project-row-${project.id}`}
      className={cn(
        "grid grid-cols-12 items-center gap-4 px-6 py-5 border-b border-neutral-200 transition-colors group",
        done ? "bg-neutral-50" : "bg-white hover:bg-neutral-50",
      )}
    >
      {/* Checkbox */}
      <div className="col-span-1 flex items-center">
        <Checkbox
          data-testid={`project-check-${project.id}`}
          checked={done}
          onCheckedChange={toggleDone}
          className="rounded-none border-neutral-400 data-[state=checked]:bg-neutral-950 data-[state=checked]:border-neutral-950 h-5 w-5"
        />
      </div>

      {/* Name + client */}
      <div className="col-span-12 md:col-span-5 min-w-0 -mt-2 md:mt-0 col-start-1 md:col-start-auto pl-9 md:pl-0">
        <Link
          to={`/project/${project.id}`}
          data-testid={`project-name-${project.id}`}
          className="block group/link"
        >
          <div className="flex items-center gap-1.5">
            <span
              className={cn(
                "font-display text-lg md:text-xl font-bold tracking-tight text-neutral-950 truncate",
                done && "line-through text-neutral-400 decoration-2 decoration-neutral-300",
              )}
            >
              {project.name}
            </span>
            <ArrowUpRight className="w-4 h-4 text-neutral-400 opacity-0 group-hover/link:opacity-100 transition-opacity flex-shrink-0" />
          </div>
          {project.client && (
            <div className="text-xs text-neutral-500 truncate mt-0.5">
              {project.client}
            </div>
          )}
        </Link>
      </div>

      {/* Status */}
      <div className="col-span-4 md:col-span-2 pl-9 md:pl-0">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              data-testid={`project-status-btn-${project.id}`}
              className="focus:outline-none focus:ring-1 focus:ring-neutral-950 focus:ring-offset-2"
            >
              <StatusBadge status={project.status} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            className="rounded-none border-neutral-300"
          >
            <DropdownMenuLabel className="text-[10px] uppercase tracking-widest text-neutral-500">
              Set Status
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {STATUSES.map((s) => (
              <DropdownMenuItem
                key={s.value}
                data-testid={`set-status-${project.id}-${s.value}`}
                onClick={() => setStatus(s.value)}
                className="rounded-none cursor-pointer"
              >
                <s.Icon className="w-4 h-4 mr-2" />
                {s.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Hours */}
      <div className="col-span-4 md:col-span-2 pl-9 md:pl-0">
        <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-neutral-500 mb-0.5 md:hidden">
          Hours
        </div>
        <span
          data-testid={`project-hours-${project.id}`}
          className={cn(
            "font-mono-num text-lg font-bold text-neutral-950",
            done && "text-neutral-400",
          )}
        >
          {project.total_hours ?? 0}
          <span className="text-xs text-neutral-500 font-normal ml-1">h</span>
        </span>
      </div>

      {/* Deadline */}
      <div className="col-span-3 md:col-span-1">
        <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-neutral-500 mb-0.5 md:hidden">
          Deadline
        </div>
        <span
          className={cn(
            "font-mono-num text-xs text-neutral-700",
            done && "text-neutral-400",
          )}
        >
          {fmtDeadline(project.deadline)}
        </span>
      </div>

      {/* Actions */}
      <div className="col-span-1 flex justify-end">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-none hover:bg-neutral-100 h-8 w-8"
              data-testid={`project-menu-${project.id}`}
            >
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="rounded-none border-neutral-300"
          >
            <DropdownMenuItem
              onClick={() => onEdit?.(project)}
              className="rounded-none cursor-pointer"
              data-testid={`project-edit-${project.id}`}
            >
              <Pencil className="w-4 h-4 mr-2" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={remove}
              className="rounded-none cursor-pointer text-red-600 focus:text-red-700"
              data-testid={`project-delete-${project.id}`}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};
