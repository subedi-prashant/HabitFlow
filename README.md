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
- **Kharcha** — automatically import NIMB and eSewa debit alerts from Gmail, add missed or cash expenses manually, and review spending in AD and Bikram Samvat.
- **Accounts** — Supabase email/password and Google auth, password reset flow, and an env-gated signup toggle.
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

## Getting Started

### Prerequisites

- Node.js 20+
- A [Supabase](https://supabase.com/) project

### Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create a `.env.local` file in the project root:

   ```bash
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
   NEXT_PUBLIC_SIGNUPS_ENABLED=true
   SUPABASE_SECRET_KEY=your-server-only-supabase-secret-key
   KHARCHA_USER_ID=your-supabase-user-id
   KHARCHA_INGEST_SECRET=generate-a-random-secret-at-least-32-characters
   ```

3. Run the migrations in `supabase/migrations/` in order through the Supabase CLI, SQL editor, or MCP. `004_kharcha_schema.sql` is self-contained because the legacy Wallet migration was not deployed to every environment.

4. Start the dev server:

   ```bash
   npm run dev
   ```

   The app runs at [http://localhost:3000](http://localhost:3000).

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
