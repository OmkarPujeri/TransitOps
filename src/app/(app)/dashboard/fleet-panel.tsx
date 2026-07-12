"use client";

import { useMemo, useState } from "react";
import { Truck, Gauge, CheckCircle2, Wrench } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/input";
import { StatCard } from "./stat-card";
import { VEHICLE_STATUS_META, type VehicleStatus } from "@/lib/types";

export type FleetVehicle = {
  status: VehicleStatus;
  type: string;
  region: string | null;
  name_model: string;
  reg_number: string;
};

// Vehicle KPIs + fleet-status breakdown, filterable by type/status/region (spec §3.2).
export function FleetPanel({ vehicles }: { vehicles: FleetVehicle[] }) {
  const [type, setType] = useState("all");
  const [status, setStatus] = useState("all");
  const [region, setRegion] = useState("all");

  const types = useMemo(
    () => Array.from(new Set(vehicles.map((v) => v.type))).sort(),
    [vehicles]
  );
  const regions = useMemo(
    () => Array.from(new Set(vehicles.map((v) => v.region).filter(Boolean) as string[])).sort(),
    [vehicles]
  );

  const filtered = useMemo(
    () =>
      vehicles.filter(
        (v) =>
          (type === "all" || v.type === type) &&
          (status === "all" || v.status === status) &&
          (region === "all" || v.region === region)
      ),
    [vehicles, type, status, region]
  );

  const counts = useMemo(() => {
    const acc: Record<string, number> = {};
    for (const v of filtered) acc[v.status] = (acc[v.status] ?? 0) + 1;
    return acc;
  }, [filtered]);

  const total = filtered.length;
  const retired = counts.retired ?? 0;
  const operational = total - retired;
  const onTrip = counts.on_trip ?? 0;
  const available = counts.available ?? 0;
  const inShop = counts.in_shop ?? 0;
  const utilization = operational > 0 ? Math.round((onTrip / operational) * 100) : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Fleet Overview</CardTitle>
        <div className="flex flex-wrap gap-2">
          <Select className="h-8 w-auto text-xs" value={type} onChange={(e) => setType(e.target.value)}>
            <option value="all">All types</option>
            {types.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Select>
          <Select className="h-8 w-auto text-xs" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="all">All statuses</option>
            {(Object.keys(VEHICLE_STATUS_META) as VehicleStatus[]).map((s) => (
              <option key={s} value={s}>
                {VEHICLE_STATUS_META[s].label}
              </option>
            ))}
          </Select>
          <Select className="h-8 w-auto text-xs" value={region} onChange={(e) => setRegion(e.target.value)}>
            <option value="all">All regions</option>
            {regions.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </Select>
        </div>
      </CardHeader>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Vehicles" value={total} hint={`${operational} operational`} icon={Truck} tone="primary" />
        <StatCard label="Available" value={available} hint="ready to dispatch" icon={CheckCircle2} tone="success" />
        <StatCard label="In Shop" value={inShop} hint="under maintenance" icon={Wrench} tone="warning" />
        <StatCard label="Utilization" value={`${utilization}%`} hint="vehicles on trip" icon={Gauge} tone="info" />
      </div>

      <div className="mt-4 space-y-3">
        {(Object.keys(VEHICLE_STATUS_META) as VehicleStatus[]).map((s) => {
          const meta = VEHICLE_STATUS_META[s];
          const count = counts[s] ?? 0;
          const pct = total > 0 ? Math.round((count / total) * 100) : 0;
          return (
            <div key={s}>
              <div className="mb-1 flex items-center justify-between text-sm">
                <Badge tone={meta.tone}>{meta.label}</Badge>
                <span className="font-medium">
                  {count} <span className="text-[var(--muted)]">({pct}%)</span>
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--surface-2)]">
                <div className="h-full rounded-full bg-[var(--primary)]" style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })}
        {total === 0 && (
          <p className="py-2 text-sm text-[var(--muted)]">No vehicles match these filters.</p>
        )}
      </div>
    </Card>
  );
}
