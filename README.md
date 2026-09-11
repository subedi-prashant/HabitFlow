# HabitFlow

**A personal performance system** for building habits, running routines, logging workouts, tracking analytics, and managing daily finances — all in one place.

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
- **Wallet** — track income/expenses by category and payment method on the Bikram Sambat calendar.
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
  (protected)/      Dashboard, habits, routines, training, analytics, settings
  auth/callback/    Supabase auth callback route
  page.tsx          Wallet (expense tracker) landing page
components/         UI primitives + feature components (habits, routines, training, layout, auth)
hooks/               React Query hooks (habits, logs, streaks, routines, training, profile)
lib/                 Supabase clients, wallet/training helpers, shared utils
supabase/migrations/ SQL schema migrations
```

## Getting Started

### Prerequisites

- Node.js 18+
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
   ```

3. In your Supabase project's SQL editor, run the migrations in `supabase/migrations/` in order (`001_initial_schema.sql`, `002_wallet_schema.sql`, `003_training_schema.sql`) to create the schema, enums, and row-level security policies.

4. Start the dev server:

   ```bash
   npm run dev
   ```

   The app runs at [http://localhost:3000](http://localhost:3000).

### Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the development server |
| `npm run build` | Build for production |
| `npm run start` | Run the production build |
| `npm run lint` | Run ESLint |

## Database Schema

| Migration | Tables |
|---|---|
| `001_initial_schema.sql` | `users_profile`, `habits`, `habit_logs`, `routines`, `streaks` |
| `002_wallet_schema.sql` | `wallet_entries` |
| `003_training_schema.sql` | `workout_sessions`, `workout_exercises`, `workout_sets`, `activity_logs` |

All tables are scoped per-user with Postgres Row-Level Security policies.

## Status

Personal project, not currently published under an open-source license.
