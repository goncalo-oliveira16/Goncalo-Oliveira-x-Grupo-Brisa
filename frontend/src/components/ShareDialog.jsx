import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { shareApi } from "@/lib/api";
import { toast } from "sonner";
import { Copy, RotateCw, Link2 } from "lucide-react";

export const ShareDialog = ({ open, onOpenChange }) => {
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    shareApi
      .getToken()
      .then((d) => setToken(d.token))
      .finally(() => setLoading(false));
  }, [open]);

  const url = token ? `${window.location.origin}/share/${token}` : "";

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied to clipboard");
    } catch {
      toast.error("Copy failed — select the text manually");
    }
  };

  const rotate = async () => {
    setLoading(true);
    try {
      const d = await shareApi.rotate();
      setToken(d.token);
      toast.success("New link generated. Old link no longer works.");
    } catch {
      toast.error("Failed to rotate link");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        data-testid="share-dialog"
        className="rounded-none border border-neutral-300 shadow-none max-w-lg"
      >
        <DialogHeader>
          <DialogTitle className="font-display text-2xl font-bold tracking-tight flex items-center gap-2">
            <Link2 className="w-5 h-5" />
            Share with your boss
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-neutral-600 leading-relaxed">
            Send this read-only link. Your boss will see all projects, statuses
            and logged hours — but can&apos;t edit anything.
          </p>

          <div className="border border-neutral-300 bg-neutral-50 p-3 flex items-center gap-2">
            <span
              data-testid="share-url"
              className="flex-1 font-mono-num text-xs break-all text-neutral-800"
            >
              {loading ? "Loading…" : url}
            </span>
            <Button
              type="button"
              onClick={copy}
              disabled={!token}
              className="rounded-none bg-neutral-950 hover:bg-neutral-800 h-9 px-3"
              data-testid="share-copy-btn"
            >
              <Copy className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-neutral-200">
            <span className="text-xs text-neutral-500">
              Anyone with this link can view your dashboard.
            </span>
            <Button
              type="button"
              variant="outline"
              onClick={rotate}
              disabled={loading}
              className="rounded-none border-neutral-300 h-9 text-xs"
              data-testid="share-rotate-btn"
            >
              <RotateCw className="w-3 h-3 mr-1.5" />
              Rotate
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
