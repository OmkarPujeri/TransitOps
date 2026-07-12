"use client";

import { useActionState, useEffect, useState } from "react";
import { FileText, Trash2, ExternalLink, UploadCloud, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { useCanEdit } from "@/components/role-context";
import { formatDate } from "@/lib/utils";
import type { Vehicle, VehicleDocument } from "@/lib/types";
import { uploadVehicleDocument, deleteVehicleDocument, getDocumentUrl } from "./document-actions";

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function VehicleDocumentsDialog({
  vehicle,
  documents,
  open,
  onClose,
}: {
  vehicle: Vehicle;
  documents: VehicleDocument[];
  open: boolean;
  onClose: () => void;
}) {
  const toast = useToast();
  const canEdit = useCanEdit("/vehicles");
  const [state, action, pending] = useActionState(uploadVehicleDocument, null);
  const [busy, setBusy] = useState<string | null>(null);
  const [opening, setOpening] = useState<string | null>(null);

  useEffect(() => {
    if (state && !state.error) {
      toast.push("Document uploaded");
    } else if (state?.error) {
      toast.push(state.error, "error");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  async function onDelete(doc: VehicleDocument) {
    if (!confirm(`Delete ${doc.name}?`)) return;
    setBusy(doc.id);
    const res = await deleteVehicleDocument(doc.id, doc.path);
    toast.push(res.error ?? "Document deleted", res.error ? "error" : "success");
    setBusy(null);
  }

  async function onOpen(doc: VehicleDocument) {
    setOpening(doc.id);
    const res = await getDocumentUrl(doc.path);
    setOpening(null);
    if (res.url) window.open(res.url, "_blank", "noopener");
    else toast.push(res.error ?? "Could not open file", "error");
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={`Documents — ${vehicle.reg_number}`}
      description="Registration, insurance, inspection certificates, and other files."
    >
      <div className="space-y-4">
        {documents.length === 0 ? (
          <div className="rounded-[var(--radius)] border border-dashed border-[var(--border)] py-8 text-center text-sm text-[var(--muted)]">
            No documents yet.
          </div>
        ) : (
          <ul className="divide-y divide-[var(--border)] rounded-[var(--radius)] border border-[var(--border)]">
            {documents.map((doc) => (
              <li key={doc.id} className="flex items-center gap-3 px-3 py-2.5">
                <FileText className="h-4 w-4 shrink-0 text-[var(--muted)]" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{doc.name}</div>
                  <div className="text-xs text-[var(--muted)]">
                    {formatSize(doc.size)} · {formatDate(doc.uploaded_at)}
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => onOpen(doc)} disabled={opening === doc.id}>
                  {opening === doc.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ExternalLink className="h-4 w-4" />
                  )}
                </Button>
                {canEdit && (
                  <Button variant="ghost" size="icon" onClick={() => onDelete(doc)} disabled={busy === doc.id}>
                    <Trash2 className="h-4 w-4 text-[var(--danger)]" />
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}

        {canEdit ? (
          <form action={action} className="flex items-end gap-2 border-t border-[var(--border)] pt-4">
            <input type="hidden" name="vehicle_id" value={vehicle.id} />
            <div className="flex-1">
              <label className="mb-1.5 block text-xs font-medium text-[var(--muted)]">Add a document</label>
              <input
                type="file"
                name="file"
                required
                className="block w-full text-sm text-[var(--muted)] file:mr-3 file:rounded-[var(--radius)] file:border-0 file:bg-[var(--surface-2)] file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-[var(--foreground)] hover:file:bg-[var(--border)]"
              />
            </div>
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
              {pending ? "Uploading…" : "Upload"}
            </Button>
          </form>
        ) : (
          <p className="border-t border-[var(--border)] pt-3 text-xs text-[var(--muted)]">
            You have read-only access to documents.
          </p>
        )}
      </div>
    </Dialog>
  );
}
