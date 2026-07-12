"use client";

import { useActionState, useEffect, useState } from "react";
import { Plus, Wrench, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";
import { Table, THead, TR, TH, TD, EmptyRow } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { useCanEdit } from "@/components/role-context";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { MaintenanceLog, Vehicle } from "@/lib/types";
import { openMaintenance, closeMaintenance } from "./actions";

const TYPES = ["Service", "Oil Change", "Tire Replacement", "Brake Repair", "Engine Repair", "Inspection"];

export function MaintenanceClient({
  logs,
  vehicles,
}: {
  logs: MaintenanceLog[];
  vehicles: Vehicle[];
}) {
  const toast = useToast();
  const canEdit = useCanEdit("/maintenance");
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [state, action, pending] = useActionState(openMaintenance, null);

  useEffect(() => {
    if (state && !state.error && open) {
      toast.push("Maintenance opened. Vehicle moved to shop");
      setOpen(false);
    } else if (state?.error) {
      toast.push(state.error, "error");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  async function onClose(id: string) {
    setBusy(id);
    const res = await closeMaintenance(id);
    toast.push(res.error ?? "Maintenance closed. Vehicle available", res.error ? "error" : "success");
    setBusy(null);
  }

  return (
    <div className="space-y-4">
      {canEdit && (
        <div className="flex justify-end">
          <Button onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" /> Log maintenance
          </Button>
        </div>
      )}

      <Table>
        <THead>
          <tr>
            <TH>Vehicle</TH>
            <TH>Type</TH>
            <TH>Description</TH>
            <TH>Cost</TH>
            <TH>Opened</TH>
            <TH>Status</TH>
            <TH className="text-right">Actions</TH>
          </tr>
        </THead>
        <tbody>
          {logs.length === 0 ? (
            <EmptyRow colSpan={7} label="No maintenance records yet." />
          ) : (
            logs.map((m) => (
              <TR key={m.id}>
                <TD className="font-mono font-medium">{m.vehicles?.reg_number ?? "—"}</TD>
                <TD>{m.type}</TD>
                <TD className="max-w-xs truncate text-[var(--muted)]">{m.description ?? "—"}</TD>
                <TD>{formatCurrency(m.cost)}</TD>
                <TD className="text-[var(--muted)]">{formatDate(m.opened_at)}</TD>
                <TD>
                  <Badge tone={m.status === "open" ? "warning" : "success"}>
                    {m.status === "open" ? "In Shop" : "Closed"}
                  </Badge>
                </TD>
                <TD>
                  <div className="flex justify-end">
                    {m.status === "open" ? (
                      canEdit ? (
                        <Button size="sm" variant="success" disabled={busy === m.id} onClick={() => onClose(m.id)}>
                          <CheckCircle2 className="h-3.5 w-3.5" /> Close & restore
                        </Button>
                      ) : (
                        <span className="text-xs text-[var(--muted)]">In shop</span>
                      )
                    ) : (
                      <span className="text-xs text-[var(--muted)]">Resolved {formatDate(m.closed_at)}</span>
                    )}
                  </div>
                </TD>
              </TR>
            ))
          )}
        </tbody>
      </Table>

      <Dialog open={open} onClose={() => setOpen(false)} title="Log maintenance" description="Vehicle will switch to In Shop and leave the dispatch pool.">
        <form action={action} className="space-y-4">
          <div>
            <Label>Vehicle</Label>
            <Select name="vehicle_id" required defaultValue="">
              <option value="" disabled>
                Select vehicle…
              </option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.reg_number} - {v.name_model} ({v.status})
                </option>
              ))}
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Type</Label>
              <Select name="type" defaultValue="Service">
                {TYPES.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Estimated cost</Label>
              <Input name="cost" type="number" min={0} defaultValue={0} />
            </div>
          </div>
          <div>
            <Label>Description</Label>
            <Textarea name="description" placeholder="e.g. Scheduled oil change and filter replacement" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              <Wrench className="h-4 w-4" /> {pending ? "Opening…" : "Open maintenance"}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
