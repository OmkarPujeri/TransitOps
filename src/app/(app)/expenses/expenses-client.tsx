"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { Plus, Pencil, Trash2, Fuel, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";
import { Table, THead, TR, TH, TD, EmptyRow } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import type { Vehicle, Trip, FuelLog, Expense } from "@/lib/types";
import { saveFuelLog, deleteFuelLog, saveExpense, deleteExpense } from "./actions";

const CATEGORIES = ["Toll", "Parking", "Repair", "Insurance", "Fine", "Other"];

const CATEGORY_TONE: Record<string, string> = {
  Toll: "info",
  Parking: "muted",
  Repair: "warning",
  Insurance: "primary",
  Fine: "danger",
  Other: "muted",
};

function todayInput(iso?: string) {
  return (iso ?? new Date().toISOString()).slice(0, 10);
}

export function ExpensesClient({
  fuelLogs,
  expenses,
  vehicles,
  trips,
}: {
  fuelLogs: FuelLog[];
  expenses: Expense[];
  vehicles: Vehicle[];
  trips: Trip[];
}) {
  const [tab, setTab] = useState<"fuel" | "expenses">("fuel");

  const vehicleName = useMemo(() => {
    const m = new Map(vehicles.map((v) => [v.id, v.reg_number]));
    return (id: string | null) => (id ? m.get(id) ?? "—" : "—");
  }, [vehicles]);

  const tripLabel = useMemo(() => {
    const m = new Map(trips.map((t) => [t.id, `${t.source} → ${t.destination}`]));
    return (id: string | null) => (id ? m.get(id) ?? "—" : "—");
  }, [trips]);

  const totals = useMemo(() => {
    const fuelCost = fuelLogs.reduce((s, f) => s + f.cost, 0);
    const liters = fuelLogs.reduce((s, f) => s + f.liters, 0);
    const expenseCost = expenses.reduce((s, e) => s + e.amount, 0);
    return { fuelCost, liters, expenseCost, combined: fuelCost + expenseCost };
  }, [fuelLogs, expenses]);

  const kpis = [
    { label: "Fuel Cost", value: formatCurrency(totals.fuelCost) },
    { label: "Fuel Volume", value: `${totals.liters.toLocaleString()} L` },
    { label: "Other Expenses", value: formatCurrency(totals.expenseCost) },
    { label: "Combined Spend", value: formatCurrency(totals.combined) },
  ];

  return (
    <div className="space-y-4">
      {/* Cost rollup */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {kpis.map((k) => (
          <Card key={k.label}>
            <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">{k.label}</p>
            <p className="mt-2 text-2xl font-bold tracking-tight">{k.value}</p>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface-2)] p-1">
        <TabButton active={tab === "fuel"} onClick={() => setTab("fuel")}>
          <Fuel className="h-4 w-4" /> Fuel logs
          <span className="ml-1 text-xs text-[var(--muted)]">{fuelLogs.length}</span>
        </TabButton>
        <TabButton active={tab === "expenses"} onClick={() => setTab("expenses")}>
          <Receipt className="h-4 w-4" /> Expenses
          <span className="ml-1 text-xs text-[var(--muted)]">{expenses.length}</span>
        </TabButton>
      </div>

      {tab === "fuel" ? (
        <FuelSection
          fuelLogs={fuelLogs}
          vehicles={vehicles}
          trips={trips}
          vehicleName={vehicleName}
          tripLabel={tripLabel}
        />
      ) : (
        <ExpenseSection
          expenses={expenses}
          vehicles={vehicles}
          trips={trips}
          vehicleName={vehicleName}
          tripLabel={tripLabel}
        />
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-1 items-center justify-center gap-2 rounded-[calc(var(--radius)-2px)] px-3 py-1.5 text-sm font-medium transition",
        active
          ? "bg-[var(--surface)] text-[var(--foreground)] shadow-sm"
          : "text-[var(--muted)] hover:text-[var(--foreground)]"
      )}
    >
      {children}
    </button>
  );
}

// ---------- Fuel logs ----------

function FuelSection({
  fuelLogs,
  vehicles,
  trips,
  vehicleName,
  tripLabel,
}: {
  fuelLogs: FuelLog[];
  vehicles: Vehicle[];
  trips: Trip[];
  vehicleName: (id: string | null) => string;
  tripLabel: (id: string | null) => string;
}) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<FuelLog | null>(null);
  const [state, action, pending] = useActionState(saveFuelLog, null);

  useEffect(() => {
    if (state && !state.error && open) {
      toast.push(editing ? "Fuel log updated" : "Fuel logged");
      setOpen(false);
      setEditing(null);
    } else if (state?.error) {
      toast.push(state.error, "error");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  async function onDelete(f: FuelLog) {
    if (!confirm("Delete this fuel log? This cannot be undone.")) return;
    const res = await deleteFuelLog(f.id);
    toast.push(res.error ?? "Fuel log deleted", res.error ? "error" : "success");
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
        >
          <Plus className="h-4 w-4" /> Log fuel
        </Button>
      </div>

      <Table>
        <THead>
          <tr>
            <TH>Date</TH>
            <TH>Vehicle</TH>
            <TH>Trip</TH>
            <TH className="text-right">Liters</TH>
            <TH className="text-right">Cost</TH>
            <TH className="text-right">Cost / L</TH>
            <TH className="text-right">Actions</TH>
          </tr>
        </THead>
        <tbody>
          {fuelLogs.length === 0 ? (
            <EmptyRow colSpan={7} label="No fuel logged yet." />
          ) : (
            fuelLogs.map((f) => (
              <TR key={f.id}>
                <TD className="whitespace-nowrap text-[var(--muted)]">{formatDate(f.logged_at)}</TD>
                <TD className="font-mono font-medium">{vehicleName(f.vehicle_id)}</TD>
                <TD className="text-[var(--muted)]">{tripLabel(f.trip_id)}</TD>
                <TD className="text-right">{f.liters.toLocaleString()} L</TD>
                <TD className="text-right">{formatCurrency(f.cost)}</TD>
                <TD className="text-right text-[var(--muted)]">
                  {f.liters > 0 ? formatCurrency(f.cost / f.liters) : "—"}
                </TD>
                <TD>
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setEditing(f);
                        setOpen(true);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => onDelete(f)}>
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
        title={editing ? "Edit fuel log" : "Log fuel"}
        description="Record a fuel fill-up against a vehicle."
      >
        <form action={action} className="space-y-4">
          {editing && <input type="hidden" name="id" value={editing.id} />}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label>Vehicle</Label>
              <Select name="vehicle_id" required defaultValue={editing?.vehicle_id ?? ""}>
                <option value="">Select vehicle…</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.reg_number} - {v.name_model}
                  </option>
                ))}
              </Select>
            </div>
            <div className="col-span-2">
              <Label>Trip (optional)</Label>
              <Select name="trip_id" defaultValue={editing?.trip_id ?? ""}>
                <option value="">Not tied to a trip</option>
                {trips.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.source} → {t.destination}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Liters</Label>
              <Input
                name="liters"
                type="number"
                min={0}
                step="0.1"
                required
                defaultValue={editing?.liters ?? ""}
                placeholder="120"
              />
            </div>
            <div>
              <Label>Cost</Label>
              <Input
                name="cost"
                type="number"
                min={0}
                step="0.01"
                required
                defaultValue={editing?.cost ?? ""}
                placeholder="210"
              />
            </div>
            <div className="col-span-2">
              <Label>Date</Label>
              <Input name="logged_at" type="date" defaultValue={todayInput(editing?.logged_at)} />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Save fuel log"}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}

// ---------- Expenses ----------

function ExpenseSection({
  expenses,
  vehicles,
  trips,
  vehicleName,
  tripLabel,
}: {
  expenses: Expense[];
  vehicles: Vehicle[];
  trips: Trip[];
  vehicleName: (id: string | null) => string;
  tripLabel: (id: string | null) => string;
}) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [state, action, pending] = useActionState(saveExpense, null);

  useEffect(() => {
    if (state && !state.error && open) {
      toast.push(editing ? "Expense updated" : "Expense added");
      setOpen(false);
      setEditing(null);
    } else if (state?.error) {
      toast.push(state.error, "error");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  async function onDelete(e: Expense) {
    if (!confirm("Delete this expense? This cannot be undone.")) return;
    const res = await deleteExpense(e.id);
    toast.push(res.error ?? "Expense deleted", res.error ? "error" : "success");
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
        >
          <Plus className="h-4 w-4" /> Add expense
        </Button>
      </div>

      <Table>
        <THead>
          <tr>
            <TH>Date</TH>
            <TH>Category</TH>
            <TH>Vehicle</TH>
            <TH>Trip</TH>
            <TH>Note</TH>
            <TH className="text-right">Amount</TH>
            <TH className="text-right">Actions</TH>
          </tr>
        </THead>
        <tbody>
          {expenses.length === 0 ? (
            <EmptyRow colSpan={7} label="No expenses logged yet." />
          ) : (
            expenses.map((e) => (
              <TR key={e.id}>
                <TD className="whitespace-nowrap text-[var(--muted)]">{formatDate(e.logged_at)}</TD>
                <TD>
                  <Badge tone={CATEGORY_TONE[e.category] ?? "muted"}>{e.category}</Badge>
                </TD>
                <TD className="font-mono">{vehicleName(e.vehicle_id)}</TD>
                <TD className="text-[var(--muted)]">{tripLabel(e.trip_id)}</TD>
                <TD className="max-w-[220px] truncate text-[var(--muted)]">{e.note ?? "—"}</TD>
                <TD className="text-right font-medium">{formatCurrency(e.amount)}</TD>
                <TD>
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setEditing(e);
                        setOpen(true);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => onDelete(e)}>
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
        title={editing ? "Edit expense" : "Add expense"}
        description="Log a toll, repair, fine, or other operating cost."
      >
        <form action={action} className="space-y-4">
          {editing && <input type="hidden" name="id" value={editing.id} />}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Category</Label>
              <Select name="category" defaultValue={editing?.category ?? "Toll"}>
                {CATEGORIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Amount</Label>
              <Input
                name="amount"
                type="number"
                min={0}
                step="0.01"
                required
                defaultValue={editing?.amount ?? ""}
                placeholder="85"
              />
            </div>
            <div>
              <Label>Vehicle (optional)</Label>
              <Select name="vehicle_id" defaultValue={editing?.vehicle_id ?? ""}>
                <option value="">Not vehicle-specific</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.reg_number} - {v.name_model}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Trip (optional)</Label>
              <Select name="trip_id" defaultValue={editing?.trip_id ?? ""}>
                <option value="">Not tied to a trip</option>
                {trips.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.source} → {t.destination}
                  </option>
                ))}
              </Select>
            </div>
            <div className="col-span-2">
              <Label>Note (optional)</Label>
              <Textarea name="note" defaultValue={editing?.note ?? ""} placeholder="I-94 tolls" />
            </div>
            <div className="col-span-2">
              <Label>Date</Label>
              <Input name="logged_at" type="date" defaultValue={todayInput(editing?.logged_at)} />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Save expense"}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
