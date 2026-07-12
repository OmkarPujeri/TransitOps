# TransitOps

A smart transport operations platform for managing a vehicle fleet end to end — vehicles, drivers, trips, and maintenance — with an automatic status state-machine enforced at the database level.

## Features

- **Fleet management** — register vehicles and drivers, track status, odometer, licenses, and safety scores.
- **Trip lifecycle** — draft → dispatch → complete/cancel, with guard checks (load limits, license expiry, availability) before dispatch.
- **Automatic state machine** — dispatching or completing a trip and opening/closing maintenance updates vehicle and driver status automatically. These rules live in Postgres triggers, so they can't be bypassed by the UI.
- **AI Copilot** (planned) — suggests the best vehicle/driver match for a trip.
- **Role-based access** — `fleet_manager`, `driver`, `safety_officer`, `financial_analyst` roles backed by Supabase Auth and Row-Level Security.

## Tech stack

- [Next.js 16](https://nextjs.org) (App Router, TypeScript) + [Tailwind CSS](https://tailwindcss.com)
- [Supabase](https://supabase.com) — Postgres, Auth, and RLS
- [Recharts](https://recharts.org) for reporting

## Getting started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

Copy the example env file and fill in your keys:

```bash
cp .env.local.example .env.local
```

| Variable | Where to get it |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API |

### 3. Set up the database

In your Supabase project, open the SQL Editor and run the contents of
[`supabase/schema.sql`](supabase/schema.sql). This creates all tables,
triggers, RLS policies, and seed data.

### 4. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Available scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run build` | Create a production build |
| `npm run start` | Serve the production build |
| `npm run lint` | Run ESLint |
