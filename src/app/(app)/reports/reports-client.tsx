"use client";

import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Download, FileDown } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { exportReportPDF } from "@/lib/pdf";
import { Table, THead, TR, TH, TD, EmptyRow } from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils";
import {
  VEHICLE_STATUS_META,
  type Vehicle,
  type Trip,
  type FuelLog,
  type Expense,
  type MaintenanceLog,
  type VehicleStatus,
} from "@/lib/types";

const COLORS = {
  primary: "#4f46e5",
  success: "#16a34a",
  warning: "#d97706",
  danger: "#dc2626",
  info: "#0284c7",
  muted: "#64748b",
};

const STATUS_COLOR: Record<VehicleStatus, string> = {
  available: COLORS.success,
  on_trip: COLORS.info,
  in_shop: COLORS.warning,
  retired: COLORS.muted,
};

type CSVRow = Record<string, string | number>;

function toCSV(rows: CSVRow[]): string {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const escape = (v: string | number) => {
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers.join(","), ...rows.map((r) => headers.map((h) => escape(r[h])).join(","))].join("\n");
}

function downloadCSV(filename: string, rows: CSVRow[]) {
  const blob = new Blob([toCSV(rows)], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function ReportsClient({
  vehicles,
  trips,
  fuelLogs,
  expenses,
  maintenance,
}: {
  vehicles: Vehicle[];
  trips: Trip[];
  fuelLogs: FuelLog[];
  expenses: Expense[];
  maintenance: MaintenanceLog[];
}) {
  const byVehicle = useMemo(() => {
    const map = new Map<
      string,
      {
        reg: string;
        name: string;
        acquisition: number;
        fuelCost: number;
        expenseCost: number;
        maintCost: number;
        revenue: number;
        distance: number;
        liters: number;
      }
    >();

    for (const v of vehicles) {
      map.set(v.id, {
        reg: v.reg_number,
        name: v.name_model,
        acquisition: v.acquisition_cost,
        fuelCost: 0,
        expenseCost: 0,
        maintCost: 0,
        revenue: 0,
        distance: 0,
        liters: 0,
      });
    }
    for (const f of fuelLogs) {
      const a = map.get(f.vehicle_id);
      if (a) {
        a.fuelCost += f.cost;
        a.liters += f.liters;
      }
    }
    for (const e of expenses) {
      if (!e.vehicle_id) continue;
      const a = map.get(e.vehicle_id);
      if (a) a.expenseCost += e.amount;
    }
    for (const m of maintenance) {
      const a = map.get(m.vehicle_id);
      if (a) a.maintCost += m.cost;
    }
    for (const t of trips) {
      if (t.status !== "completed" || !t.vehicle_id) continue;
      const a = map.get(t.vehicle_id);
      if (a) {
        a.revenue += t.revenue ?? 0;
        a.distance += t.actual_distance_km ?? t.planned_distance_km ?? 0;
      }
    }

    return Array.from(map.values()).map((a) => {
      const totalCost = a.fuelCost + a.expenseCost + a.maintCost;
      // Spec §3.8 ROI = (Revenue − (Maintenance + Fuel)) / Acquisition Cost, as a %.
      const roiBase = a.revenue - (a.maintCost + a.fuelCost);
      return {
        ...a,
        totalCost,
        efficiency: a.liters > 0 ? Number((a.distance / a.liters).toFixed(1)) : 0,
        net: a.revenue - totalCost,
        roi: a.acquisition > 0 ? Number(((roiBase / a.acquisition) * 100).toFixed(1)) : 0,
      };
    });
  }, [vehicles, trips, fuelLogs, expenses, maintenance]);

  const statusData = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const v of vehicles) counts[v.status] = (counts[v.status] ?? 0) + 1;
    return (Object.keys(VEHICLE_STATUS_META) as VehicleStatus[])
      .map((s) => ({ status: s, name: VEHICLE_STATUS_META[s].label, value: counts[s] ?? 0 }))
      .filter((d) => d.value > 0);
  }, [vehicles]);

  const totals = useMemo(() => {
    const cost = byVehicle.reduce((s, v) => s + v.totalCost, 0);
    const revenue = byVehicle.reduce((s, v) => s + v.revenue, 0);
    const withFuel = byVehicle.filter((v) => v.efficiency > 0);
    const avgEff = withFuel.length ? withFuel.reduce((s, v) => s + v.efficiency, 0) / withFuel.length : 0;
    return { cost, revenue, net: revenue - cost, avgEff: Number(avgEff.toFixed(1)) };
  }, [byVehicle]);

  const efficiencyData = byVehicle.filter((v) => v.efficiency > 0);
  const active = byVehicle.filter((v) => v.totalCost > 0 || v.revenue > 0);

  const summary = [
    { label: "Operating Cost", value: formatCurrency(totals.cost) },
    { label: "Revenue", value: formatCurrency(totals.revenue) },
    { label: "Net", value: formatCurrency(totals.net) },
    { label: "Avg Fuel Efficiency", value: `${totals.avgEff} km/L` },
  ];

  function exportPDF() {
    exportReportPDF({
      title: "Reports & Analytics",
      subtitle: "Fleet cost, utilization, and performance breakdown.",
      filename: "transitops-report.pdf",
      summary,
      tables: [
        {
          heading: "Per-Vehicle Breakdown",
          columns: [
            { header: "Vehicle", key: "vehicle" },
            { header: "Revenue", key: "revenue" },
            { header: "Cost", key: "cost" },
            { header: "Net", key: "net" },
            { header: "ROI %", key: "roi" },
            { header: "km/L", key: "eff" },
          ],
          rows: byVehicle.map((v) => ({
            vehicle: `${v.reg} · ${v.name}`,
            revenue: formatCurrency(v.revenue),
            cost: formatCurrency(v.totalCost),
            net: formatCurrency(v.net),
            roi: `${v.roi}%`,
            eff: v.efficiency || "—",
          })),
        },
      ],
    });
  }

  return (
    <div className="space-y-4">
      {/* Export bar */}
      <div className="flex justify-end">
        <Button size="sm" variant="outline" onClick={exportPDF} disabled={byVehicle.length === 0}>
          <FileDown className="h-4 w-4" /> Export PDF
        </Button>
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {summary.map((s) => (
          <Card key={s.label}>
            <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">{s.label}</p>
            <p className="mt-2 text-2xl font-bold tracking-tight">{s.value}</p>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Cost per vehicle (stacked) */}
        <Card>
          <CardHeader>
            <CardTitle>Cost per Vehicle</CardTitle>
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                downloadCSV(
                  "cost-per-vehicle.csv",
                  byVehicle.map((v) => ({
                    vehicle: v.reg,
                    fuel: v.fuelCost,
                    expenses: v.expenseCost,
                    maintenance: v.maintCost,
                    total: v.totalCost,
                  }))
                )
              }
            >
              <Download className="h-4 w-4" /> CSV
            </Button>
          </CardHeader>
          {active.length === 0 ? (
            <Empty />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={byVehicle}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="reg" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                <Legend />
                <Bar dataKey="fuelCost" name="Fuel" stackId="c" fill={COLORS.info} />
                <Bar dataKey="expenseCost" name="Expenses" stackId="c" fill={COLORS.warning} />
                <Bar dataKey="maintCost" name="Maintenance" stackId="c" fill={COLORS.danger} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* Fleet status pie */}
        <Card>
          <CardHeader>
            <CardTitle>Fleet Utilization</CardTitle>
          </CardHeader>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={statusData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={2}>
                {statusData.map((d) => (
                  <Cell key={d.status} fill={STATUS_COLOR[d.status as VehicleStatus]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        {/* Fuel efficiency */}
        <Card>
          <CardHeader>
            <CardTitle>Fuel Efficiency (km/L)</CardTitle>
          </CardHeader>
          {efficiencyData.length === 0 ? (
            <Empty />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={efficiencyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="reg" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v) => `${Number(v)} km/L`} />
                <Bar dataKey="efficiency" name="km/L" fill={COLORS.success} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* Vehicle ROI */}
        <Card>
          <CardHeader>
            <CardTitle>Vehicle ROI %</CardTitle>
          </CardHeader>
          {active.length === 0 ? (
            <Empty />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={active}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="reg" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v) => `${Number(v)}%`} />
                <Bar dataKey="roi" name="ROI %" radius={[4, 4, 0, 0]}>
                  {active.map((v) => (
                    <Cell key={v.reg} fill={v.roi >= 0 ? COLORS.success : COLORS.danger} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      {/* Per-vehicle table */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-base font-semibold">Per-Vehicle Breakdown</h3>
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              downloadCSV(
                "vehicle-breakdown.csv",
                byVehicle.map((v) => ({
                  vehicle: v.reg,
                  model: v.name,
                  revenue: v.revenue,
                  operating_cost: v.totalCost,
                  net: v.net,
                  roi_pct: v.roi,
                  distance_km: v.distance,
                  efficiency_km_per_l: v.efficiency,
                }))
              )
            }
          >
            <Download className="h-4 w-4" /> Export CSV
          </Button>
        </div>
        <Table>
          <THead>
            <TR>
              <TH>Vehicle</TH>
              <TH className="text-right">Revenue</TH>
              <TH className="text-right">Cost</TH>
              <TH className="text-right">Net</TH>
              <TH className="text-right">ROI %</TH>
              <TH className="text-right">km/L</TH>
            </TR>
          </THead>
          <tbody>
            {byVehicle.length === 0 ? (
              <EmptyRow colSpan={6} label="No vehicles yet." />
            ) : (
              byVehicle.map((v) => (
                <TR key={v.reg}>
                  <TD className="font-medium">
                    {v.reg} <span className="text-[var(--muted)]">· {v.name}</span>
                  </TD>
                  <TD className="text-right">{formatCurrency(v.revenue)}</TD>
                  <TD className="text-right">{formatCurrency(v.totalCost)}</TD>
                  <TD className="text-right" style={{ color: v.net >= 0 ? "var(--success)" : "var(--danger)" }}>
                    {formatCurrency(v.net)}
                  </TD>
                  <TD className="text-right" style={{ color: v.roi >= 0 ? "var(--success)" : "var(--danger)" }}>
                    {v.roi}%
                  </TD>
                  <TD className="text-right">{v.efficiency || "—"}</TD>
                </TR>
              ))
            )}
          </tbody>
        </Table>
      </div>
    </div>
  );
}

function Empty() {
  return (
    <div className="grid h-[280px] place-items-center text-sm text-[var(--muted)]">
      No data yet — dispatch and complete a few trips to populate this report.
    </div>
  );
}
