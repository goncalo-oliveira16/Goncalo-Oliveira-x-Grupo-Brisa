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
import { Button } from "@/components/ui/button";
import { entriesApi } from "@/lib/api";
import { toast } from "sonner";

const todayStr = () => new Date().toISOString().slice(0, 10);

export const EntryDialog = ({
  open,
  onOpenChange,
  projectId,
  entry,
  onSaved,
}) => {
  const isEdit = Boolean(entry?.id);
  const [form, setForm] = useState({
    date: todayStr(),
    hours: "",
    description: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(
        entry
          ? {
              date: entry.date || todayStr(),
              hours: String(entry.hours ?? ""),
              description: entry.description || "",
            }
          : { date: todayStr(), hours: "", description: "" },
      );
    }
  }, [open, entry]);

  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    const hours = parseFloat(form.hours);
    if (!form.date) return toast.error("Pick a date");
    if (isNaN(hours) || hours <= 0)
      return toast.error("Hours must be greater than 0");
    setSaving(true);
    try {
      const payload = {
        date: form.date,
        hours,
        description: form.description.trim(),
      };
      if (isEdit) {
        await entriesApi.update(entry.id, payload);
        toast.success("Entry updated");
      } else {
        await entriesApi.create(projectId, payload);
        toast.success("Hours logged");
      }
      onSaved?.();
      onOpenChange(false);
    } catch (err) {
      toast.error("Failed to save entry");
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        data-testid="entry-dialog"
        className="rounded-none border border-neutral-300 shadow-none max-w-md"
      >
        <DialogHeader>
          <DialogTitle className="font-display text-2xl font-bold tracking-tight">
            {isEdit ? "Edit Entry" : "Log Hours"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold uppercase tracking-[0.15em] text-neutral-600">
                Date
              </Label>
              <Input
                data-testid="entry-date-input"
                type="date"
                value={form.date}
                onChange={(e) => update("date", e.target.value)}
                className="rounded-none border-neutral-300 font-mono-num"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold uppercase tracking-[0.15em] text-neutral-600">
                Hours
              </Label>
              <Input
                data-testid="entry-hours-input"
                type="number"
                step="0.25"
                min="0"
                value={form.hours}
                onChange={(e) => update("hours", e.target.value)}
                placeholder="e.g. 2.5"
                className="rounded-none border-neutral-300 font-mono-num"
                autoFocus
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-[10px] font-bold uppercase tracking-[0.15em] text-neutral-600">
              What did you do?
            </Label>
            <Textarea
              data-testid="entry-description-input"
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
              placeholder="Storyboard revisions, color grading, client call…"
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
              data-testid="entry-dialog-cancel"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="rounded-none bg-neutral-950 hover:bg-neutral-800"
              data-testid="entry-dialog-save"
            >
              {saving ? "Saving…" : isEdit ? "Save Changes" : "Log Hours"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
