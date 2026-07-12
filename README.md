<p align="center">
  <img src="https://img.icons8.com/fluency/96/truck.png" width="80" alt="TransitOps logo" />
</p>

<h1 align="center">TransitOps</h1>

<p align="center">
  <strong>Smart Transport Operations Platform</strong><br/>
  End-to-end fleet management — vehicles, drivers, trips, maintenance, expenses — with a status engine enforced at the database, not the UI.
</p>

<p align="center">
  <a href="#-features"><img src="https://img.shields.io/badge/Features-8-blue?style=flat-square" alt="Features" /></a>
  <a href="#-tech-stack"><img src="https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js" alt="Next.js 16" /></a>
  <a href="#-tech-stack"><img src="https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black" alt="React 19" /></a>
  <a href="#-tech-stack"><img src="https://img.shields.io/badge/Supabase-Postgres-3ECF8E?style=flat-square&logo=supabase&logoColor=white" alt="Supabase" /></a>
  <a href="#-tech-stack"><img src="https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript" /></a>
  <a href="#-tech-stack"><img src="https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white" alt="Tailwind CSS 4" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-green?style=flat-square" alt="License MIT" /></a>
</p>

<p align="center">
  <a href="#-quick-start">Quick Start</a> •
  <a href="#-features">Features</a> •
  <a href="#-architecture">Architecture</a> •
  <a href="#-project-structure">Project Structure</a> •
  <a href="#-api-reference">API Reference</a> •
  <a href="#-contributing">Contributing</a>
</p>

---

## ✨ Features

| Module | Description |
|--------|-------------|
| **📊 Dashboard** | Real-time KPIs — active trips, driver availability, open maintenance, revenue. Fleet overview with filter-by-type/status/region. Alerts for expired licenses, suspended drivers, and in-shop vehicles. |
| **🚛 Fleet Management** | Register vehicles with model, type, load capacity, odometer, acquisition cost, and region. Full CRUD with status badges. Vehicle document upload via Supabase Storage (private bucket, signed URLs). |
| **👷 Driver Management** | Track drivers with license details (number, category, expiry), contact info, safety scores, and status. Visual warnings for expiring/expired licenses. |
| **🗺️ Trip Lifecycle** | Full state machine: `draft → dispatched → completed / cancelled`. Guard checks on dispatch (load limits, license expiry, driver/vehicle availability). Automatic status sync for vehicles and drivers. |
| **🔧 Maintenance** | Open/close maintenance jobs per vehicle. Opening a job automatically moves the vehicle to `in_shop`; closing it moves it back to `available`. |
| **💰 Fuel & Expenses** | Log fuel fills and general expenses (tolls, parking, etc.) against vehicles and trips. Category tagging, inline editing, and deletion. |
| **📈 Reports & Analytics** | Interactive charts via Recharts — cost-per-vehicle (stacked bar), fleet utilization (donut), fuel efficiency (bar), vehicle ROI (bar). Per-vehicle breakdown table. CSV + branded PDF export (jsPDF). |
| **🤖 AI Copilot** | Chat interface grounded in live fleet data via Groq (Llama 3.3 70B). Ask natural-language questions about idle vehicles, best driver for a load, operating costs, etc. AI dispatch recommendations with deterministic fallback. |

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                          Client (Browser)                           │
│                                                                      │
│   Landing Page ─── Auth (Login/Signup) ─── App Shell (Sidebar)       │
│                                             │                        │
│   ┌─────────┬──────────┬───────┬────────┬───┴────┬────────┬────────┐ │
│   │Dashboard│ Vehicles │Drivers│ Trips  │Mainten.│Expenses│Reports │ │
│   │         │ + Docs   │       │        │        │ + Fuel │ + PDF  │ │
│   └────┬────┴────┬─────┴───┬──┴────┬───┴────┬───┴────┬───┴────┬───┘ │
│        │         │         │       │        │        │   AI Copilot  │
└────────┼─────────┼─────────┼───────┼────────┼────────┼────────┼──────┘
         │         │         │       │        │        │        │
    Server Actions  │    Server Actions  │   Server Actions     │
         │         │         │       │        │        │        │
┌────────┼─────────┼─────────┼───────┼────────┼────────┼────────┼──────┐
│        ▼         ▼         ▼       ▼        ▼        ▼        ▼      │
│                     Next.js 16 (App Router)                          │
│                                                                      │
│   Middleware (JWT verify + RBAC route guard)                          │
│   Server Components ──── Server Actions ──── API Routes              │
│                                                                      │
│   ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐       │
│   │  /api/copilot │  │ /api/dispatch│  │  /api/reminders      │       │
│   │  Groq LLM    │  │ AI ranking   │  │  License email alert │       │
│   └──────────────┘  └──────────────┘  └──────────────────────┘       │
└──────────────────────────────┬───────────────────────────────────────┘
                               │
                    Supabase Client SDK
                               │
┌──────────────────────────────┼───────────────────────────────────────┐
│                         Supabase (BaaS)                              │
│                              │                                       │
│   ┌──────────────────────────┼────────────────────────────────┐      │
│   │              PostgreSQL Database                          │      │
│   │                                                           │      │
│   │   Tables: profiles, vehicles, drivers, trips,             │      │
│   │           maintenance_logs, fuel_logs, expenses,          │      │
│   │           vehicle_documents                               │      │
│   │                                                           │      │
│   │   Triggers: trip_state_machine, maintenance_state_machine,│      │
│   │             handle_new_user                               │      │
│   │                                                           │      │
│   │   RLS Policies: rbac_read (all auth), rbac_write (role)   │      │
│   └───────────────────────────────────────────────────────────┘      │
│                                                                      │
│   ┌────────────────┐  ┌────────────────┐                             │
│   │  Supabase Auth │  │Supabase Storage│                             │
│   │  (JWT + roles) │  │ (vehicle-docs) │                             │
│   └────────────────┘  └────────────────┘                             │
└──────────────────────────────────────────────────────────────────────┘

External Services:
  ┌─────────────┐   ┌─────────────┐
  │  Groq API   │   │ Resend API  │
  │ (AI/LLM)    │   │ (Email)     │
  │  Optional   │   │  Optional   │
  └─────────────┘   └─────────────┘
```

### State Machine (Database-Enforced)

The trip and maintenance state machines live as **Postgres triggers**, making them impossible to bypass from the UI:

```
                         TRIP STATE MACHINE
    ┌───────┐     dispatch      ┌────────────┐    complete     ┌───────────┐
    │ Draft ├──────────────────►│ Dispatched ├───────────────►│ Completed │
    └───────┘                   └─────┬──────┘                └───────────┘
                                      │ cancel
                                      ▼
                                ┌───────────┐
                                │ Cancelled │
                                └───────────┘

    Guard checks on dispatch:
    ✓ Vehicle must be assigned & available
    ✓ Driver must be assigned & available
    ✓ Driver license must not be expired
    ✓ Cargo weight must not exceed vehicle capacity

    Side effects:
    • Dispatch  → vehicle + driver status → 'on_trip'
    • Complete  → vehicle + driver status → 'available', odometer += distance
    • Cancel    → vehicle + driver status → 'available' (if on_trip)
```

```
                      MAINTENANCE STATE MACHINE
    ┌──────┐     close      ┌────────┐
    │ Open ├───────────────►│ Closed │
    └──┬───┘                └────────┘
       │
       │ Side effects:
       │ • Open   → vehicle status → 'in_shop'
       │ • Close  → vehicle status → 'available'
```

---

## 🔐 Role-Based Access Control (RBAC)

TransitOps implements **defense-in-depth RBAC** — enforced at three layers:

| Layer | Mechanism | File |
|-------|-----------|------|
| **UI** | Sidebar hides inaccessible routes; edit buttons disabled | `src/lib/permissions.ts` |
| **Middleware** | JWT-embedded role checked on every request; redirects unauthorized access | `src/lib/supabase/middleware.ts` |
| **Database** | Row-Level Security policies gate INSERT/UPDATE/DELETE by role | `supabase/rbac.sql` |

### Permission Matrix

| Module | Fleet Manager | Driver | Safety Officer | Financial Analyst |
|--------|:---:|:---:|:---:|:---:|
| Dashboard | ✅ view / edit | ✅ view | ✅ view | ✅ view |
| Vehicles | ✅ view / edit | ✅ view | ✅ view | ✅ view |
| Drivers | ✅ view / edit | ✅ view | ✅ view / edit | ✅ view |
| Trips | ✅ view / edit | ✅ view / edit | — | — |
| Maintenance | ✅ view / edit | — | — | ✅ view |
| Fuel & Expenses | ✅ view / edit | ✅ view / edit | — | — |
| Reports | ✅ view / edit | — | ✅ view | ✅ view |
| AI Copilot | ✅ | ✅ | ✅ | ✅ |

---

## 🛠️ Tech Stack

| Category | Technology | Purpose |
|----------|-----------|---------|
| **Framework** | [Next.js 16](https://nextjs.org) (App Router) | Server Components, Server Actions, API Routes |
| **Language** | [TypeScript 5](https://typescriptlang.org) | End-to-end type safety |
| **UI** | [React 19](https://react.dev) | Component library |
| **Styling** | [Tailwind CSS 4](https://tailwindcss.com) | Utility-first CSS with custom dark theme |
| **Icons** | [Lucide React](https://lucide.dev) | Consistent icon system |
| **Backend** | [Supabase](https://supabase.com) | Postgres, Auth, RLS, Storage |
| **Charts** | [Recharts 3](https://recharts.org) | Interactive data visualization |
| **AI** | [Groq](https://groq.com) (Llama 3.3 70B) | Fleet copilot & dispatch recommendations |
| **PDF** | [jsPDF](https://github.com/parallax/jsPDF) + [jspdf-autotable](https://github.com/simonbengtsson/jsPDF-AutoTable) | Branded report export |
| **Email** | [Resend](https://resend.com) | License expiry reminders (optional) |
| **Fonts** | [Geist Sans & Mono](https://vercel.com/font) | Typography |

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** ≥ 18.x
- **npm** ≥ 9.x (or yarn/pnpm)
- A **Supabase** project ([create one free](https://supabase.com/dashboard))

### 1. Clone the repository

```bash
git clone https://github.com/OmkarPujeri/TransitOps.git
cd TransitOps
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

```bash
cp .env.local.example .env.local
```

Fill in your keys:

| Variable | Required | Where to get it |
|----------|:---:|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Supabase → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Supabase → Project Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Supabase → Project Settings → API |
| `GROQ_API_KEY` | ⬜ | [console.groq.com/keys](https://console.groq.com/keys) — enables AI Copilot |
| `RESEND_API_KEY` | ⬜ | [resend.com](https://resend.com) — enables email alerts |
| `RESEND_FROM` | ⬜ | Sender address for email alerts |

### 4. Set up the database

Run the following SQL files **in order** in your Supabase SQL Editor:

```
1. supabase/schema.sql      → Tables, enums, triggers, RLS, seed data
2. supabase/rbac.sql         → Role-gated write policies
3. supabase/documents.sql    → Vehicle document storage (optional)
```

### 5. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — you're live! 🎉

### 6. Create your first account

Navigate to `/signup`, pick a role (e.g. `Fleet Manager`), and you'll land on the dashboard with pre-seeded vehicles and drivers ready to go.

---

## 📁 Project Structure

```
TransitOps/
├── public/                          # Static assets
├── supabase/
│   ├── schema.sql                   # Core tables, enums, triggers, RLS, seed data
│   ├── rbac.sql                     # Role-gated RLS write policies
│   └── documents.sql                # Vehicle document storage setup
├── src/
│   ├── middleware.ts                 # Route-level auth + session refresh
│   ├── app/
│   │   ├── layout.tsx               # Root layout (Geist fonts, Toast provider)
│   │   ├── page.tsx                  # Marketing landing page
│   │   ├── globals.css              # Design tokens (dark theme) + Tailwind
│   │   ├── (auth)/
│   │   │   ├── actions.ts           # login, signup, logout server actions
│   │   │   ├── login/page.tsx       # Login page
│   │   │   └── signup/page.tsx      # Signup page with role picker
│   │   ├── (app)/
│   │   │   ├── layout.tsx           # Authenticated shell (sidebar + RBAC)
│   │   │   ├── dashboard/
│   │   │   │   ├── page.tsx         # KPI cards, fleet overview, alerts
│   │   │   │   ├── stat-card.tsx    # Reusable stat card component
│   │   │   │   └── fleet-panel.tsx  # Filterable fleet grid
│   │   │   ├── vehicles/
│   │   │   │   ├── page.tsx         # Vehicle list (server component)
│   │   │   │   ├── vehicles-client.tsx  # CRUD table with dialog forms
│   │   │   │   ├── vehicle-documents.tsx # Document upload/download
│   │   │   │   ├── actions.ts       # Vehicle server actions
│   │   │   │   └── document-actions.ts  # Document upload/delete actions
│   │   │   ├── drivers/
│   │   │   │   ├── page.tsx         # Driver list
│   │   │   │   ├── drivers-client.tsx   # CRUD table with license tracking
│   │   │   │   └── actions.ts       # Driver server actions
│   │   │   ├── trips/
│   │   │   │   ├── page.tsx         # Trip list
│   │   │   │   ├── trips-client.tsx # Full lifecycle UI (create/dispatch/complete/cancel)
│   │   │   │   └── actions.ts       # Trip server actions (dispatch, complete, cancel)
│   │   │   ├── maintenance/
│   │   │   │   ├── page.tsx         # Maintenance log list
│   │   │   │   ├── maintenance-client.tsx # Open/close jobs UI
│   │   │   │   └── actions.ts       # Maintenance server actions
│   │   │   ├── expenses/
│   │   │   │   ├── page.tsx         # Fuel & expenses combined view
│   │   │   │   ├── expenses-client.tsx  # Tabbed fuel/expense management
│   │   │   │   └── actions.ts       # Fuel log + expense server actions
│   │   │   ├── reports/
│   │   │   │   ├── page.tsx         # Reports data loader
│   │   │   │   └── reports-client.tsx # Charts, tables, CSV/PDF export
│   │   │   └── copilot/
│   │   │       ├── page.tsx         # Copilot data loader
│   │   │       └── copilot-client.tsx # Chat UI + fleet stat strip
│   │   └── api/
│   │       ├── copilot/route.ts     # POST — AI chat (Groq + fleet snapshot)
│   │       ├── dispatch/route.ts    # POST — AI dispatch recommendation
│   │       └── reminders/route.ts   # POST — License expiry email alerts
│   ├── components/
│   │   ├── sidebar.tsx              # RBAC-aware navigation sidebar
│   │   ├── page-header.tsx          # Page title/subtitle component
│   │   ├── auth-shell.tsx           # Auth page layout wrapper
│   │   ├── role-context.tsx         # React context for current user role
│   │   └── ui/                      # Design system primitives
│   │       ├── badge.tsx            # Status badges with tone variants
│   │       ├── button.tsx           # Button with variants (CVA)
│   │       ├── card.tsx             # Card container
│   │       ├── dialog.tsx           # Modal dialog
│   │       ├── input.tsx            # Form input with label/error
│   │       ├── table.tsx            # Table primitives (THead, TR, TH, TD)
│   │       └── toast.tsx            # Toast notification system
│   └── lib/
│       ├── types.ts                 # Shared TypeScript types & status metadata
│       ├── permissions.ts           # RBAC permission matrix (view/edit per route)
│       ├── utils.ts                 # cn(), formatCurrency(), formatDate(), daysUntil()
│       ├── use-sort.tsx             # Generic sortable column hook
│       ├── groq.ts                  # Groq API client (OpenAI-compatible)
│       ├── fleet-snapshot.ts        # Build compact fleet summary for AI context
│       ├── email.ts                 # Resend email client (fetch, no SDK)
│       ├── pdf.ts                   # Branded PDF report generator (jsPDF)
│       └── supabase/
│           ├── server.ts            # Supabase server client (SSR cookie-based)
│           └── middleware.ts        # Session refresh + RBAC route guard (Edge)
├── .env.local.example               # Template for environment variables
├── package.json
├── tsconfig.json
├── next.config.ts
├── postcss.config.mjs
└── eslint.config.mjs
```

---

## 📡 API Reference

### `POST /api/copilot`

AI chat grounded in live fleet data.

**Request:**
```json
{
  "messages": [
    { "role": "user", "content": "Which vehicles are idle right now?" }
  ]
}
```

**Response:**
```json
{
  "reply": "Currently 5 vehicles are available: VAN-05, TRK-12, VAN-08, PKP-02, VAN-09..."
}
```

---

### `POST /api/dispatch`

AI-powered dispatch recommendation — picks the optimal vehicle + driver for a cargo weight.

**Request:**
```json
{
  "cargo_weight_kg": 15000
}
```

**Response:**
```json
{
  "vehicle_id": "uuid",
  "driver_id": "uuid",
  "reason": "TRK-11 (20,000kg capacity, 5,000kg spare) is the tightest fit, paired with Alex Morgan (safety score 96)."
}
```

**Selection algorithm:**
- **Vehicle**: Smallest sufficient capacity → lowest odometer
- **Driver**: Highest safety score → most license runway

---

### `POST /api/reminders`

License expiry email digest. No `RESEND_API_KEY` = dry-run preview.

**Request:**
```json
{
  "withinDays": 30
}
```

**Response:**
```json
{
  "sent": true,
  "dryRun": false,
  "count": 2,
  "drivers": [
    { "name": "Sam Okoye", "license": "DL-2205", "expiry": "2026-07-07", "expired": true }
  ]
}
```

---

## 🗃️ Database Schema

### Entity Relationship

```
profiles ────────────────┐
  id (PK, FK → auth.users) │
  full_name, role           │
                            │
vehicles ◄──────────────────┤ (vehicle_id FK)
  id, reg_number, name_model│
  type, max_load_kg, odometer│
  acquisition_cost, status  │
  region                    │───► maintenance_logs
                            │       id, vehicle_id, type
                            │       description, cost
                            │       status (open/closed)
                            │
                            │───► fuel_logs
                            │       id, vehicle_id, trip_id
                            │       liters, cost
                            │
                            │───► expenses
                            │       id, vehicle_id, trip_id
                            │       category, amount, note
                            │
                            │───► vehicle_documents
                            │       id, vehicle_id, name
                            │       path, size, mime
                            │
drivers ◄──────────────────┤ (driver_id FK)
  id, full_name             │
  license_number/category   │
  license_expiry            │
  contact, safety_score     │
  status                    │
                            │
trips ◄─────────────────────┘
  id, source, destination
  vehicle_id, driver_id
  cargo_weight_kg
  planned/actual_distance_km
  fuel_consumed_l, revenue
  status (draft/dispatched/completed/cancelled)
  created_by (FK → profiles)
```

### Triggers

| Trigger | Table | When | Effect |
|---------|-------|------|--------|
| `trg_trip_state` | `trips` | BEFORE INSERT/UPDATE | Validates dispatch, auto-syncs vehicle/driver status |
| `trg_maint_state` | `maintenance_logs` | BEFORE INSERT/UPDATE | Flips vehicle status between `in_shop` ↔ `available` |
| `on_auth_user_created` | `auth.users` | AFTER INSERT | Auto-creates a `profiles` row with role from metadata |

---

## 📜 Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start the development server (with Turbopack) |
| `npm run build` | Create an optimized production build |
| `npm run start` | Serve the production build |
| `npm run lint` | Run ESLint across the codebase |

---

## 🤝 Contributing

Contributions are welcome! Here's how to get started:

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'feat: add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

### Commit Convention

This project follows [Conventional Commits](https://www.conventionalcommits.org/):

| Prefix | Purpose |
|--------|---------|
| `feat:` | New feature |
| `fix:` | Bug fix |
| `docs:` | Documentation only |
| `style:` | Formatting, no logic change |
| `refactor:` | Code restructuring |
| `test:` | Adding or updating tests |
| `chore:` | Build, CI, dependency updates |

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgements

- [Next.js](https://nextjs.org) — The React framework for production
- [Supabase](https://supabase.com) — Open-source Firebase alternative
- [Recharts](https://recharts.org) — Composable charting library
- [Groq](https://groq.com) — Ultra-fast LLM inference
- [Lucide](https://lucide.dev) — Beautiful, consistent icons
- [Vercel](https://vercel.com) — Deployment platform

---

<p align="center">
  Built with ❤️ by <a href="https://github.com/OmkarPujeri">Omkar Pujeri</a>, <a href="https://github.com/abhijitdoescoding">abhijitdoescoding</a>, and <a href="https://github.com/Abhinav7864">Abhinav7864</a>
</p>
