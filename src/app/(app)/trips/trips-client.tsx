"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { Plus, Send, CheckCircle2, XCircle, Sparkles, AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input, Label, Select } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";
import { Table, THead, TR, TH, TD, EmptyRow } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { daysUntil } from "@/lib/utils";
import { TRIP_STATUS_META, type Trip, type Vehicle, type Driver } from "@/lib/types";
import { createTrip, dispatchTrip, completeTrip, cancelTrip } from "./actions";

export function TripsClient({
  trips,
  vehicles,
  drivers,
}: {
  trips: Trip[];
  vehicles: Vehicle[];
  drivers: Driver[];
}) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(createTrip, null);

  // form fields (controlled for live validation + AI prefill)
  const [vehicleId, setVehicleId] = useState("");
  const [driverId, setDriverId] = useState("");
  const [cargo, setCargo] = useState<number>(0);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiReason, setAiReason] = useState<string | null>(null);

  const availableVehicles = vehicles.filter((v) => v.status === "available");
  const eligibleDrivers = drivers.filter(
    (d) => d.status === "available" && (daysUntil(d.license_expiry) ?? -1) >= 0
  );

  const selectedVehicle = vehicles.find((v) => v.id === vehicleId);
  const overCapacity = selectedVehicle ? cargo > selectedVehicle.max_load_kg : false;
  const canDispatch = vehicleId && driverId && cargo > 0 && !overCapacity;

  useEffect(() => {
    if (state && !state.error && open) {
      toast.push("Trip created");
      resetForm();
      setOpen(false);
    } else if (state?.error) {
      toast.push(state.error, "error");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  function resetForm() {
    setVehicleId("");
    setDriverId("");
    setCargo(0);
    setAiReason(null);
  }

  async function askAI() {
    setAiLoading(true);
    setAiReason(null);
    try {
      const res = await fetch("/api/dispatch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cargo_weight_kg: cargo }),
      });
      const data = await res.json();
      if (data.error) {
        toast.push(data.error, "error");
      } else {
        if (data.vehicle_id) setVehicleId(data.vehicle_id);
        if (data.driver_id) setDriverId(data.driver_id);
        setAiReason(data.reason ?? null);
        toast.push("Copilot picked the best match", "info");
      }
    } catch {
      toast.push("AI request failed — the AI service isn't configured yet", "error");
    } finally {
      setAiLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          onClick={() => {
            resetForm();
            setOpen(true);
          }}
        >
          <Plus className="h-4 w-4" /> New trip
        </Button>
      </div>

      <TripsTable trips={trips} />

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Create trip"
        description="Only available vehicles and license-valid, available drivers can be dispatched."
        className="max-w-xl"
      >
        <form action={action} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Source</Label>
              <Input name="source" required placeholder="Chicago" />
            </div>
            <div>
              <Label>Destination</Label>
              <Input name="destination" required placeholder="Detroit" />
            </div>
          </div>

          {/* AI Copilot */}
          <div className="rounded-[var(--radius)] border border-indigo-200 bg-indigo-50/60 p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-medium text-indigo-700">
                <Sparkles className="h-4 w-4" /> Dispatch Copilot
              </div>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={askAI}
                disabled={aiLoading || cargo <= 0}
              >
                {aiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {aiLoading ? "Thinking…" : "AI Recommend"}
              </Button>
            </div>
            {cargo <= 0 && (
              <p className="mt-1 text-xs text-indigo-600/70">Enter cargo weight to get a recommendation.</p>
            )}
            {aiReason && <p className="mt-2 text-xs text-indigo-800">{aiReason}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Vehicle (available only)</Label>
              <Select
                name="vehicle_id"
                required
                value={vehicleId}
                onChange={(e) => setVehicleId(e.target.value)}
              >
                <option value="">Select vehicle…</option>
                {availableVehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.reg_number} — {v.name_model} ({v.max_load_kg.toLocaleString()}kg)
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Driver (eligible only)</Label>
              <Select
                name="driver_id"
                required
                value={driverId}
                onChange={(e) => setDriverId(e.target.value)}
              >
                <option value="">Select driver…</option>
                {eligibleDrivers.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.full_name} — safety {d.safety_score}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Cargo weight (kg)</Label>
              <Input
                name="cargo_weight_kg"
                type="number"
                min={0}
                required
                value={cargo || ""}
                onChange={(e) => setCargo(Number(e.target.value))}
              />
            </div>
            <div>
              <Label>Planned distance (km)</Label>
              <Input name="planned_distance_km" type="number" min={0} required defaultValue={0} />
            </div>
            <div className="col-span-2">
              <Label>Revenue (optional)</Label>
              <Input name="revenue" type="number" min={0} placeholder="4200" />
            </div>
          </div>

          {overCapacity && selectedVehicle && (
            <p className="flex items-center gap-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
              <AlertTriangle className="h-4 w-4" />
              Cargo {cargo.toLocaleString()}kg exceeds {selectedVehicle.reg_number}&apos;s capacity of{" "}
              {selectedVehicle.max_load_kg.toLocaleString()}kg.
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            {/* Save as draft */}
            <Button type="submit" name="dispatch" value="0" variant="secondary" disabled={pending}>
              Save draft
            </Button>
            {/* Dispatch immediately */}
            <Button type="submit" name="dispatch" value="1" disabled={pending || !canDispatch}>
              <Send className="h-4 w-4" /> Dispatch now
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}

function TripsTable({ trips }: { trips: Trip[] }) {
  const toast = useToast();
  const [completing, setCompleting] = useState<Trip | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  async function run(id: string, fn: () => Promise<{ error?: string }>, ok: string) {
    setBusy(id);
    const res = await fn();
    toast.push(res.error ?? ok, res.error ? "error" : "success");
    setBusy(null);
  }

  return (
    <>
      <Table>
        <THead>
          <tr>
            <TH>Route</TH>
            <TH>Vehicle</TH>
            <TH>Driver</TH>
            <TH>Cargo</TH>
            <TH>Distance</TH>
            <TH>Status</TH>
            <TH className="text-right">Actions</TH>
          </tr>
        </THead>
        <tbody>
          {trips.length === 0 ? (
            <EmptyRow colSpan={7} label="No trips yet. Create your first dispatch." />
          ) : (
            trips.map((t) => (
              <TR key={t.id}>
                <TD className="font-medium">
                  {t.source} → {t.destination}
                </TD>
                <TD className="font-mono">{t.vehicles?.reg_number ?? "—"}</TD>
                <TD>{t.drivers?.full_name ?? "—"}</TD>
                <TD>{t.cargo_weight_kg.toLocaleString()} kg</TD>
                <TD>{(t.actual_distance_km ?? t.planned_distance_km).toLocaleString()} km</TD>
                <TD>
                  <Badge tone={TRIP_STATUS_META[t.status].tone}>{TRIP_STATUS_META[t.status].label}</Badge>
                </TD>
                <TD>
                  <div className="flex justify-end gap-1.5">
                    {t.status === "draft" && (
                      <Button
                        size="sm"
                        disabled={busy === t.id}
                        onClick={() => run(t.id, () => dispatchTrip(t.id), "Trip dispatched")}
                      >
                        <Send className="h-3.5 w-3.5" /> Dispatch
                      </Button>
                    )}
                    {t.status === "dispatched" && (
                      <>
                        <Button size="sm" variant="success" onClick={() => setCompleting(t)}>
                          <CheckCircle2 className="h-3.5 w-3.5" /> Complete
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busy === t.id}
                          onClick={() => run(t.id, () => cancelTrip(t.id), "Trip cancelled")}
                        >
                          <XCircle className="h-3.5 w-3.5" /> Cancel
                        </Button>
                      </>
                    )}
                    {(t.status === "completed" || t.status === "cancelled") && (
                      <span className="text-xs text-[var(--muted)]">—</span>
                    )}
                  </div>
                </TD>
              </TR>
            ))
          )}
        </tbody>
      </Table>

      <CompleteDialog
        trip={completing}
        onClose={() => setCompleting(null)}
        onDone={() => setCompleting(null)}
      />
    </>
  );
}

function CompleteDialog({
  trip,
  onClose,
  onDone,
}: {
  trip: Trip | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const toast = useToast();
  const [distance, setDistance] = useState(0);
  const [fuel, setFuel] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (trip) {
      setDistance(trip.planned_distance_km);
      setFuel(0);
    }
  }, [trip]);

  if (!trip) return null;

  async function submit() {
    setBusy(true);
    const res = await completeTrip(trip!.id, distance, fuel);
    setBusy(false);
    if (res.error) return toast.push(res.error, "error");
    toast.push("Trip completed — vehicle & driver freed");
    onDone();
  }

  return (
    <Dialog open={!!trip} onClose={onClose} title="Complete trip" description="Log final odometer & fuel.">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Actual distance (km)</Label>
            <Input type="number" min={0} value={distance} onChange={(e) => setDistance(Number(e.target.value))} />
          </div>
          <div>
            <Label>Fuel consumed (L)</Label>
            <Input type="number" min={0} value={fuel} onChange={(e) => setFuel(Number(e.target.value))} />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="success" onClick={submit} disabled={busy}>
            {busy ? "Completing…" : "Complete trip"}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
