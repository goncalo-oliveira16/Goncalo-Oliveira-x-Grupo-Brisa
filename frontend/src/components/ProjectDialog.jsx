import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { STATUSES } from "@/lib/constants";
import { projectsApi } from "@/lib/api";
import { toast } from "sonner";

const empty = {
  name: "",
  client: "",
  description: "",
  deadline: "",
  status: "in_progress",
};

export const ProjectDialog = ({ open, onOpenChange, project, onSaved }) => {
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const isEdit = Boolean(project?.id);

  useEffect(() => {
    if (open) {
      setForm(
        project
          ? {
              name: project.name || "",
              client: project.client || "",
              description: project.description || "",
              deadline: project.deadline || "",
              status: project.status || "in_progress",
            }
          : empty,
      );
    }
  }, [open, project]);

  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Project name is required");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        client: form.client.trim(),
        description: form.description.trim(),
        deadline: form.deadline || null,
        status: form.status,
      };
      if (isEdit) {
        await projectsApi.update(project.id, payload);
        toast.success("Project updated");
      } else {
        await projectsApi.create(payload);
        toast.success("Project created");
      }
      onSaved?.();
      onOpenChange(false);
    } catch (err) {
      toast.error("Failed to save project");
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        data-testid="project-dialog"
        className="rounded-none border border-neutral-300 shadow-none max-w-lg"
      >
        <DialogHeader>
          <DialogTitle className="font-display text-2xl font-bold tracking-tight">
            {isEdit ? "Edit Project" : "New Project"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-[10px] font-bold uppercase tracking-[0.15em] text-neutral-600">
              Name
            </Label>
            <Input
              data-testid="project-name-input"
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              placeholder="e.g. Q1 Brand Video"
              className="rounded-none border-neutral-300 focus-visible:ring-1 focus-visible:ring-neutral-950"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold uppercase tracking-[0.15em] text-neutral-600">
                Client
              </Label>
              <Input
                data-testid="project-client-input"
                value={form.client}
                onChange={(e) => update("client", e.target.value)}
                placeholder="Optional"
                className="rounded-none border-neutral-300"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold uppercase tracking-[0.15em] text-neutral-600">
                Deadline
              </Label>
              <Input
                data-testid="project-deadline-input"
                type="date"
                value={form.deadline || ""}
                onChange={(e) => update("deadline", e.target.value)}
                className="rounded-none border-neutral-300 font-mono-num"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-[10px] font-bold uppercase tracking-[0.15em] text-neutral-600">
              Status
            </Label>
            <Select
              value={form.status}
              onValueChange={(v) => update("status", v)}
            >
              <SelectTrigger
                data-testid="project-status-select"
                className="rounded-none border-neutral-300"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-none">
                {STATUSES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-[10px] font-bold uppercase tracking-[0.15em] text-neutral-600">
              Description
            </Label>
            <Textarea
              data-testid="project-description-input"
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
              placeholder="What is this project about?"
              rows={3}
              className="rounded-none border-neutral-300 resize-none"
            />
          </div>

          <DialogFooter className="pt-2 gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="rounded-none border-neutral-300"
              data-testid="project-dialog-cancel"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="rounded-none bg-neutral-950 hover:bg-neutral-800"
              data-testid="project-dialog-save"
            >
              {saving ? "Saving…" : isEdit ? "Save Changes" : "Create Project"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
