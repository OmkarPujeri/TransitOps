"use client";

import { useActionState, useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input, Label, Select } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";
import { Table, THead, TR, TH, TD, EmptyRow } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { useCanEdit } from "@/components/role-context";
import { formatCurrency } from "@/lib/utils";
import { VEHICLE_STATUS_META, type Vehicle, type VehicleStatus } from "@/lib/types";
import { saveVehicle, deleteVehicle } from "./actions";

const TYPES = ["Truck", "Van", "Pickup", "Car", "Bus"];
const STATUSES: VehicleStatus[] = ["available", "on_trip", "in_shop", "retired"];

export function VehiclesClient({ vehicles }: { vehicles: Vehicle[] }) {
  const toast = useToast();
  const canEdit = useCanEdit("/vehicles");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Vehicle | null>(null);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [state, action, pending] = useActionState(saveVehicle, null);

  useEffect(() => {
    if (state && !state.error && open) {
      toast.push(editing ? "Vehicle updated" : "Vehicle registered");
      setOpen(false);
      setEditing(null);
    } else if (state?.error) {
      toast.push(state.error, "error");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const filtered = vehicles.filter((v) => {
    const matchesQ =
      !q ||
      v.reg_number.toLowerCase().includes(q.toLowerCase()) ||
      v.name_model.toLowerCase().includes(q.toLowerCase());
    const matchesStatus = statusFilter === "all" || v.status === statusFilter;
    return matchesQ && matchesStatus;
  });

  async function onDelete(v: Vehicle) {
    if (!confirm(`Delete ${v.reg_number}? This cannot be undone.`)) return;
    const res = await deleteVehicle(v.id);
    toast.push(res.error ?? "Vehicle deleted", res.error ? "error" : "success");
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
          <Input
            className="pl-9"
            placeholder="Search reg number or model…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <Select
          className="w-44"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {VEHICLE_STATUS_META[s].label}
            </option>
          ))}
        </Select>
        {canEdit && (
          <Button
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
          >
            <Plus className="h-4 w-4" /> Register vehicle
          </Button>
        )}
      </div>

      <Table>
        <THead>
          <tr>
            <TH>Reg #</TH>
            <TH>Model</TH>
            <TH>Type</TH>
            <TH>Capacity</TH>
            <TH>Odometer</TH>
            <TH>Cost</TH>
            <TH>Status</TH>
            <TH className="text-right">Actions</TH>
          </tr>
        </THead>
        <tbody>
          {filtered.length === 0 ? (
            <EmptyRow colSpan={8} label="No vehicles match your filters." />
          ) : (
            filtered.map((v) => (
              <TR key={v.id}>
                <TD className="font-mono font-medium">{v.reg_number}</TD>
                <TD>{v.name_model}</TD>
                <TD className="text-[var(--muted)]">{v.type}</TD>
                <TD>{v.max_load_kg.toLocaleString()} kg</TD>
                <TD>{v.odometer.toLocaleString()} km</TD>
                <TD>{formatCurrency(v.acquisition_cost)}</TD>
                <TD>
                  <Badge tone={VEHICLE_STATUS_META[v.status].tone}>
                    {VEHICLE_STATUS_META[v.status].label}
                  </Badge>
                </TD>
                <TD>
                  <div className="flex justify-end gap-1">
                    {canEdit ? (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setEditing(v);
                            setOpen(true);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => onDelete(v)}>
                          <Trash2 className="h-4 w-4 text-[var(--danger)]" />
                        </Button>
                      </>
                    ) : (
                      <span className="text-xs text-[var(--muted)]">—</span>
                    )}
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
        title={editing ? `Edit ${editing.reg_number}` : "Register vehicle"}
        description="Vehicles enter the fleet as Available."
      >
        <form action={action} className="space-y-4">
          {editing && <input type="hidden" name="id" value={editing.id} />}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Registration #</Label>
              <Input name="reg_number" required defaultValue={editing?.reg_number} placeholder="VAN-05" />
            </div>
            <div>
              <Label>Model</Label>
              <Input name="name_model" required defaultValue={editing?.name_model} placeholder="Ford Transit" />
            </div>
            <div>
              <Label>Type</Label>
              <Select name="type" defaultValue={editing?.type ?? "Truck"}>
                {TYPES.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Region</Label>
              <Input name="region" defaultValue={editing?.region ?? ""} placeholder="North" />
            </div>
            <div>
              <Label>Max load (kg)</Label>
              <Input name="max_load_kg" type="number" min={0} required defaultValue={editing?.max_load_kg ?? 500} />
            </div>
            <div>
              <Label>Odometer (km)</Label>
              <Input name="odometer" type="number" min={0} required defaultValue={editing?.odometer ?? 0} />
            </div>
            <div>
              <Label>Acquisition cost</Label>
              <Input
                name="acquisition_cost"
                type="number"
                min={0}
                required
                defaultValue={editing?.acquisition_cost ?? 0}
              />
            </div>
            <div>
              <Label>Status</Label>
              <Select name="status" defaultValue={editing?.status ?? "available"}>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {VEHICLE_STATUS_META[s].label}
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
              {pending ? "Saving…" : "Save vehicle"}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
