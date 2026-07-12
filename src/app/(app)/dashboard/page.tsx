import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TR, TH, TD, EmptyRow } from "@/components/ui/table";
import { StatCard } from "./stat-card";
import { FleetPanel, type FleetVehicle } from "./fleet-panel";
import { formatCurrency } from "@/lib/utils";
import {
  TRIP_STATUS_META,
  type VehicleStatus,
  type DriverStatus,
  type TripStatus,
} from "@/lib/types";
import { Route, Users, Wrench, DollarSign, AlertTriangle } from "lucide-react";

type VehicleRow = {
  status: VehicleStatus;
  name_model: string;
  reg_number: string;
  type: string;
  region: string | null;
};
type DriverRow = { full_name: string; status: DriverStatus; license_expiry: string; safety_score: number };
type TripRow = {
  status: TripStatus;
  revenue: number | null;
  source: string;
  destination: string;
  created_at: string;
};

function countBy<T extends string>(rows: { status: T }[]): Record<string, number> {
  const acc: Record<string, number> = {};
  for (const r of rows) acc[r.status] = (acc[r.status] ?? 0) + 1;
  return acc;
}

export default async function DashboardPage() {
  const supabase = await createClient();

  const [vehiclesRes, driversRes, tripsRes, maintRes] = await Promise.all([
    supabase.from("vehicles").select("status, name_model, reg_number, type, region"),
    supabase.from("drivers").select("full_name, status, license_expiry, safety_score"),
    supabase
      .from("trips")
      .select("status, revenue, source, destination, created_at")
      .order("created_at", { ascending: false }),
    supabase.from("maintenance_logs").select("status"),
  ]);

  const vehicles = (vehiclesRes.data ?? []) as VehicleRow[];
  const drivers = (driversRes.data ?? []) as DriverRow[];
  const trips = (tripsRes.data ?? []) as TripRow[];
  const maint = (maintRes.data ?? []) as { status: string }[];

  const dStatus = countBy(drivers);
  const tStatus = countBy(trips);

  const totalDrivers = drivers.length;
  const driversOnDuty = (dStatus.available ?? 0) + (dStatus.on_trip ?? 0);
  const activeTrips = tStatus.dispatched ?? 0;
  const draftTrips = tStatus.draft ?? 0;
  const openMaint = maint.filter((m) => m.status === "open").length;
  const totalRevenue = trips
    .filter((t) => t.status === "completed")
    .reduce((sum, t) => sum + (t.revenue ?? 0), 0);

  const today = new Date().toISOString().slice(0, 10);
  const expiredLicenses = drivers.filter((d) => d.license_expiry < today);
  const suspendedDrivers = drivers.filter((d) => d.status === "suspended");
  const inShopVehicles = vehicles.filter((v) => v.status === "in_shop");
  const recentTrips = trips.slice(0, 5);

  const alerts = [
    ...expiredLicenses.map((d) => ({ tone: "danger", text: `${d.full_name}'s license has expired` })),
    ...suspendedDrivers.map((d) => ({ tone: "danger", text: `${d.full_name} is suspended` })),
    ...inShopVehicles.map((v) => ({ tone: "warning", text: `${v.reg_number} (${v.name_model}) is in the shop` })),
  ];

  return (
    <div>
      <PageHeader title="Dashboard" subtitle="Fleet operations at a glance." />

      {/* Operational KPIs (trips, drivers, maintenance, revenue) */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Active Trips" value={activeTrips} hint={`${draftTrips} in draft`} icon={Route} tone="info" />
        <StatCard label="Drivers On Duty" value={`${driversOnDuty}/${totalDrivers}`} hint="available or on trip" icon={Users} tone="info" />
        <StatCard label="Open Maintenance" value={openMaint} hint="jobs in progress" icon={Wrench} tone="warning" />
        <StatCard label="Revenue" value={formatCurrency(totalRevenue)} hint="completed trips" icon={DollarSign} tone="success" />
      </div>

      {/* Filterable fleet overview (spec §3.2: filter by type, status, region) */}
      <div className="mt-4">
        <FleetPanel vehicles={vehicles as FleetVehicle[]} />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4">
        {/* Recent trips */}
        <div>
          <h3 className="mb-3 text-base font-semibold">Recent Trips</h3>
          <Table>
            <THead>
              <TR>
                <TH>Route</TH>
                <TH>Status</TH>
                <TH className="text-right">Revenue</TH>
              </TR>
            </THead>
            <tbody>
              {recentTrips.length === 0 ? (
                <EmptyRow colSpan={3} label="No trips yet." />
              ) : (
                recentTrips.map((t, i) => (
                  <TR key={i}>
                    <TD className="font-medium">
                      {t.source} <span className="text-[var(--muted)]">→</span> {t.destination}
                    </TD>
                    <TD>
                      <Badge tone={TRIP_STATUS_META[t.status].tone}>{TRIP_STATUS_META[t.status].label}</Badge>
                    </TD>
                    <TD className="text-right">{t.revenue != null ? formatCurrency(t.revenue) : "—"}</TD>
                  </TR>
                ))
              )}
            </tbody>
          </Table>
        </div>
      </div>

      {/* Alerts */}
      <Card className="mt-4">
        <CardHeader>
          <CardTitle>
            <span className="inline-flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-[var(--warning)]" /> Alerts
            </span>
          </CardTitle>
          <Badge tone={alerts.length ? "danger" : "success"}>{alerts.length} active</Badge>
        </CardHeader>
        {alerts.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">All clear — no fleet alerts right now.</p>
        ) : (
          <ul className="space-y-2">
            {alerts.map((a, i) => (
              <li key={i} className="flex items-center gap-2 text-sm">
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ background: a.tone === "danger" ? "var(--danger)" : "var(--warning)" }}
                />
                {a.text}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
