export type Role = "fleet_manager" | "driver" | "safety_officer" | "financial_analyst";

export const ROLE_LABELS: Record<Role, string> = {
  fleet_manager: "Fleet Manager",
  driver: "Driver",
  safety_officer: "Safety Officer",
  financial_analyst: "Financial Analyst",
};

export type VehicleStatus = "available" | "on_trip" | "in_shop" | "retired";
export type DriverStatus = "available" | "on_trip" | "off_duty" | "suspended";
export type TripStatus = "draft" | "dispatched" | "completed" | "cancelled";
export type MaintenanceStatus = "open" | "closed";

export interface Profile {
  id: string;
  full_name: string | null;
  role: Role;
  created_at: string;
}

export interface Vehicle {
  id: string;
  reg_number: string;
  name_model: string;
  type: string;
  max_load_kg: number;
  odometer: number;
  acquisition_cost: number;
  status: VehicleStatus;
  region: string | null;
  created_at: string;
}

export interface Driver {
  id: string;
  full_name: string;
  license_number: string;
  license_category: string;
  license_expiry: string;
  contact: string | null;
  safety_score: number;
  status: DriverStatus;
  created_at: string;
}

export interface Trip {
  id: string;
  source: string;
  destination: string;
  vehicle_id: string | null;
  driver_id: string | null;
  cargo_weight_kg: number;
  planned_distance_km: number;
  actual_distance_km: number | null;
  fuel_consumed_l: number | null;
  revenue: number | null;
  status: TripStatus;
  created_at: string;
  vehicles?: Vehicle | null;
  drivers?: Driver | null;
}

export interface MaintenanceLog {
  id: string;
  vehicle_id: string;
  type: string;
  description: string | null;
  cost: number;
  status: MaintenanceStatus;
  opened_at: string;
  closed_at: string | null;
  vehicles?: Vehicle | null;
}

export interface FuelLog {
  id: string;
  vehicle_id: string;
  trip_id: string | null;
  liters: number;
  cost: number;
  logged_at: string;
}

export interface Expense {
  id: string;
  vehicle_id: string | null;
  trip_id: string | null;
  category: string;
  amount: number;
  note: string | null;
  logged_at: string;
}

export interface VehicleDocument {
  id: string;
  vehicle_id: string;
  name: string;
  path: string;
  size: number;
  mime: string | null;
  uploaded_at: string;
}

export const VEHICLE_STATUS_META: Record<VehicleStatus, { label: string; tone: string }> = {
  available: { label: "Available", tone: "success" },
  on_trip: { label: "On Trip", tone: "info" },
  in_shop: { label: "In Shop", tone: "warning" },
  retired: { label: "Retired", tone: "muted" },
};

export const DRIVER_STATUS_META: Record<DriverStatus, { label: string; tone: string }> = {
  available: { label: "Available", tone: "success" },
  on_trip: { label: "On Trip", tone: "info" },
  off_duty: { label: "Off Duty", tone: "muted" },
  suspended: { label: "Suspended", tone: "danger" },
};

export const TRIP_STATUS_META: Record<TripStatus, { label: string; tone: string }> = {
  draft: { label: "Draft", tone: "muted" },
  dispatched: { label: "Dispatched", tone: "info" },
  completed: { label: "Completed", tone: "success" },
  cancelled: { label: "Cancelled", tone: "danger" },
};
