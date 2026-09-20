# HabitFlow

**A personal performance system** for building habits, running routines, logging workouts, tracking analytics, and accounting for daily expenses — all in one place.

[![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-Postgres_%26_Auth-3ECF8E?logo=supabase&logoColor=white)](https://supabase.com/)

Live at **[habitflows.tech](https://www.habitflows.tech/)**

## Overview

HabitFlow is a Next.js (App Router) application backed by Supabase. It combines habit tracking, guided routines, workout/activity logging, analytics, and a Bikram Sambat (Nepali calendar) expense tracker behind Supabase-authenticated, row-level-secured user accounts.

## Features

- **Habits** — create habits with icon, color, category, and daily/weekly/custom frequency; log completions and track streaks.
- **Routines** — group habits into morning, evening, fitness, or custom routines you can step through each day.
- **Training** — log strength workouts (exercises, sets, reps, weight, RPE) and cardio/activity sessions (type, duration, distance, calories, intensity).
- **Analytics** — 30-day view of completion rates, streaks, and workout volume, visualized with charts.
- **Kharcha** — automatically import NIMB debit alerts and eSewa merchant-payment emails from Gmail, add missed or cash expenses manually, review unsupported templates, and analyze spending in AD and Bikram Sambat.
- **Accounts** — Supabase email/password and Google auth, password reset flow, row-level data isolation, and an environment-gated signup toggle.
- **Polish** — light/dark/system theming, responsive sidebar + mobile bottom navigation, drag-and-drop, and animated UI.

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | [Next.js 14](https://nextjs.org/) (App Router), React 18, TypeScript |
| Styling / UI | Tailwind CSS, Radix UI primitives, Framer Motion, Lucide icons |
| Data & Auth | [Supabase](https://supabase.com/) (Postgres, Auth, Row-Level Security), `@supabase/ssr` |
| Data fetching | TanStack Query (React Query) |
| Forms & validation | React Hook Form, Zod |
| Charts | Recharts |
| Other | `dnd-kit` (drag & drop), `date-fns`, `nepali-date-converter`, `sonner` (toasts) |

## Project Structure

```
app/
  (auth)/          Login, signup, forgot/reset password
  (protected)/     Dashboard, habits, routines, training, analytics, Kharcha, settings
  api/kharcha/     Signed Gmail ingestion route
  auth/callback/   Supabase auth callback route
components/        UI primitives + feature components
hooks/             React Query hooks
integrations/      Google Apps Script Gmail collector
lib/               Supabase clients, parsers, domain helpers, shared utils
supabase/migrations/ SQL schema migrations
```

## Current State

HabitFlow is actively used as a personal, production-deployed application. Habits, routines, training, analytics, authentication, and manual Kharcha entries are functional. The Gmail collector currently supports NIMB debit alerts and the observed eSewa merchant-payment template. NIMB credits are ignored because they are not expenses; unknown eSewa templates such as bank-load confirmations are retained for parser review instead of being imported automatically. NIC ASIA remains intentionally disabled until a real alert template is available.

## Local Development

Local development uses the Supabase CLI stack so application work cannot modify production data. Hosted Supabase credentials should only exist in the deployment environment and must not be copied into `.env.local`.

### Prerequisites

- Node.js 20+
- Docker Desktop or another Docker-compatible container runtime

### Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Start the local Supabase stack. The first run downloads its container images and applies every migration in `supabase/migrations/`:

   ```bash
   npm run supabase:start
   ```

3. Display the generated local URL and credentials:

   ```bash
   npm run supabase:status
   ```

4. Copy `.env.example` to `.env.local`, then replace the placeholder publishable and secret values with the local values printed by the previous command. Keep `NEXT_PUBLIC_SUPABASE_URL` set to `http://127.0.0.1:54321`. Use only a local test user's ID and a local-only ingestion secret for the optional Kharcha ingestion route.

5. Start the application:

   ```bash
   npm run dev
   ```

The app runs at [http://localhost:3000](http://localhost:3000), Supabase Studio at [http://127.0.0.1:54323](http://127.0.0.1:54323), and captured local authentication emails at [http://127.0.0.1:54324](http://127.0.0.1:54324).

Use `npm run supabase:stop` when finished. Use `npm run supabase:reset` to rebuild only the local database from migrations; never add `--linked` to that command unless you explicitly intend to reset a remote non-production project.

### Production Configuration

Production uses a separate hosted Supabase project. Configure `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SECRET_KEY`, `KHARCHA_USER_ID`, and `KHARCHA_INGEST_SECRET` only in the deployment platform. Apply reviewed migrations to production separately; local `supabase:start` and `supabase:reset` commands do not target the hosted project.

### Kharcha Gmail collector

1. Deploy the app with `SUPABASE_SECRET_KEY`, `KHARCHA_USER_ID`, and `KHARCHA_INGEST_SECRET` configured as server-only environment variables.
2. In Gmail, create a label named `KharchaBank`.
3. Create two Gmail filters that apply `KharchaBank` to new messages from `donot_reply@nimb.com.np` and `donotreply@esewa.com.np`. Do not apply the filters to existing messages when starting without a backfill.
4. Create a standalone Google Apps Script project and copy `integrations/kharcha-gmail/Code.gs` and `appsscript.json` into it. The manifest enables the Advanced Gmail API with read-only access; if `Gmail` does not appear under **Services**, add **Gmail API v1** there.
5. In Apps Script **Project Settings → Script Properties**, set:
   - `KHARCHA_API_URL` to the deployed `/api/kharcha/ingest/email` HTTPS endpoint.
   - `KHARCHA_INGEST_SECRET` to the same secret configured on the server.
   - Optionally, `KHARCHA_GMAIL_LABEL` if using a label other than `KharchaBank`; labels are limited to letters, numbers, hyphens, and underscores.
6. Run `TestConnection` and approve the read-only Gmail, external request, and trigger permissions. It verifies the label and sends a connection heartbeat.
7. Run `Setup` once. It starts from the current time and installs the one-minute collector. Run `Disable` to remove the trigger.

The collector queries only messages that have the configured label and come from an exact supported sender. Google still presents mailbox-wide read-only consent because Gmail does not provide a label-restricted OAuth scope. NIC ASIA is intentionally excluded until a real alert template is available. Raw email bodies and secret values are not stored in Supabase or logged by the integration.

### Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the development server |
| `npm run build` | Build for production |
| `npm run start` | Run the production build |
| `npm run lint` | Run ESLint |
| `npm test` | Run the deterministic parser and ingestion tests |
| `npm run supabase:start` | Start local Supabase and apply migrations |
| `npm run supabase:status` | Show local service URLs and credentials |
| `npm run supabase:stop` | Stop local Supabase while preserving its data |
| `npm run supabase:reset` | Rebuild the local database from migrations |

## Database Schema

| Migration | Tables |
|---|---|
| `001_initial_schema.sql` | `users_profile`, `habits`, `habit_logs`, `routines`, `streaks` |
| `002_wallet_schema.sql` | Legacy `wallet_entries` schema; no longer used by the app |
| `003_training_schema.sql` | `workout_sessions`, `workout_exercises`, `workout_sets`, `activity_logs` |
| `004_kharcha_schema.sql` | `kharcha_transactions`, `kharcha_ingestion_events`, `kharcha_sync_state` |

All user-facing records are scoped per user with Postgres Row-Level Security. The signed ingestion route uses a server-only Supabase secret key after authenticating the collector request.

## Status

Personal project, not currently published under an open-source license.
