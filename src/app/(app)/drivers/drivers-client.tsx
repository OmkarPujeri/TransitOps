"use client";

import { useActionState, useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Search, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input, Label, Select } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";
import { Table, THead, TR, TH, TD, EmptyRow } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { formatDate, daysUntil, cn } from "@/lib/utils";
import { DRIVER_STATUS_META, type Driver, type DriverStatus } from "@/lib/types";
import { saveDriver, deleteDriver } from "./actions";

const STATUSES: DriverStatus[] = ["available", "on_trip", "off_duty", "suspended"];
const CATEGORIES = ["A", "B", "C", "D", "E"];

function LicenseCell({ expiry }: { expiry: string }) {
  const days = daysUntil(expiry);
  const expired = days != null && days < 0;
  const soon = days != null && days >= 0 && days <= 30;
  return (
    <div className="flex items-center gap-1.5">
      <span className={cn(expired && "text-[var(--danger)] font-medium")}>{formatDate(expiry)}</span>
      {expired && (
        <Badge tone="danger">
          <AlertTriangle className="mr-1 h-3 w-3" /> Expired
        </Badge>
      )}
      {soon && <Badge tone="warning">{days}d left</Badge>}
    </div>
  );
}

export function DriversClient({ drivers }: { drivers: Driver[] }) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Driver | null>(null);
  const [q, setQ] = useState("");
  const [state, action, pending] = useActionState(saveDriver, null);

  useEffect(() => {
    if (state && !state.error && open) {
      toast.push(editing ? "Driver updated" : "Driver added");
      setOpen(false);
      setEditing(null);
    } else if (state?.error) {
      toast.push(state.error, "error");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const filtered = drivers.filter(
    (d) =>
      !q ||
      d.full_name.toLowerCase().includes(q.toLowerCase()) ||
      d.license_number.toLowerCase().includes(q.toLowerCase())
  );

  async function onDelete(d: Driver) {
    if (!confirm(`Delete ${d.full_name}?`)) return;
    const res = await deleteDriver(d.id);
    toast.push(res.error ?? "Driver deleted", res.error ? "error" : "success");
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
          <Input
            className="pl-9"
            placeholder="Search name or license…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
        >
          <Plus className="h-4 w-4" /> Add driver
        </Button>
      </div>

      <Table>
        <THead>
          <tr>
            <TH>Name</TH>
            <TH>License #</TH>
            <TH>Cat.</TH>
            <TH>License expiry</TH>
            <TH>Safety</TH>
            <TH>Status</TH>
            <TH className="text-right">Actions</TH>
          </tr>
        </THead>
        <tbody>
          {filtered.length === 0 ? (
            <EmptyRow colSpan={7} label="No drivers found." />
          ) : (
            filtered.map((d) => (
              <TR key={d.id}>
                <TD className="font-medium">{d.full_name}</TD>
                <TD className="font-mono text-[var(--muted)]">{d.license_number}</TD>
                <TD>{d.license_category}</TD>
                <TD>
                  <LicenseCell expiry={d.license_expiry} />
                </TD>
                <TD>
                  <span
                    className={cn(
                      "font-medium",
                      d.safety_score < 60
                        ? "text-[var(--danger)]"
                        : d.safety_score < 80
                          ? "text-[var(--warning)]"
                          : "text-[var(--success)]"
                    )}
                  >
                    {d.safety_score}
                  </span>
                </TD>
                <TD>
                  <Badge tone={DRIVER_STATUS_META[d.status].tone}>
                    {DRIVER_STATUS_META[d.status].label}
                  </Badge>
                </TD>
                <TD>
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setEditing(d);
                        setOpen(true);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => onDelete(d)}>
                      <Trash2 className="h-4 w-4 text-[var(--danger)]" />
                    </Button>
                  </div>
                </TD>
              </TR>
            ))
          )}
        </tbody>
      </Table>

      <Dialog
        open={open}
        onClose={() => {
          setOpen(false);
          setEditing(null);
        }}
        title={editing ? `Edit ${editing.full_name}` : "Add driver"}
      >
        <form action={action} className="space-y-4">
          {editing && <input type="hidden" name="id" value={editing.id} />}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label>Full name</Label>
              <Input name="full_name" required defaultValue={editing?.full_name} />
            </div>
            <div>
              <Label>License number</Label>
              <Input name="license_number" required defaultValue={editing?.license_number} placeholder="DL-2201" />
            </div>
            <div>
              <Label>Category</Label>
              <Select name="license_category" defaultValue={editing?.license_category ?? "C"}>
                {CATEGORIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </Select>
            </div>
            <div>
              <Label>License expiry</Label>
              <Input name="license_expiry" type="date" required defaultValue={editing?.license_expiry} />
            </div>
            <div>
              <Label>Contact</Label>
              <Input name="contact" defaultValue={editing?.contact ?? ""} placeholder="+1-555-0100" />
            </div>
            <div>
              <Label>Safety score (0–100)</Label>
              <Input
                name="safety_score"
                type="number"
                min={0}
                max={100}
                required
                defaultValue={editing?.safety_score ?? 100}
              />
            </div>
            <div>
              <Label>Status</Label>
              <Select name="status" defaultValue={editing?.status ?? "available"}>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {DRIVER_STATUS_META[s].label}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Save driver"}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
