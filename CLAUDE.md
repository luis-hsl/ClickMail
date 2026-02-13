# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Clickmail is an Email Deliverability Optimizer — a React SPA that manages email campaigns with automatic domain warmup, email verification, AI-generated content variations, and spam score analysis. Built by Oneclick. UI is in Portuguese, code in English.

## Commands

```bash
npm run dev       # Start Vite dev server (localhost:5173, auto-opens browser)
npm run build     # Production build to dist/
npm run preview   # Preview production build
npm run lint      # ESLint
```

## Environment Setup

```bash
cp .env.example .env
# Required: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
# All frontend env vars use VITE_ prefix (exposed via import.meta.env)
```

## Architecture

**Frontend**: React 19 + Vite 6 + React Router DOM 7 + Tailwind CSS 3
**Backend**: Supabase (PostgreSQL, Auth, Storage, Realtime)
**Automation**: n8n workflows (email verification, AI variants, warmup scheduling, SES dispatch)
**Email Sending**: Amazon SES
**External APIs**: MillionVerifier (email verification), Anthropic Claude (AI content generation)

### Path Alias

`@` maps to `./src` (configured in `vite.config.js`). Always use `@/` imports for src files.

### Routing

Defined in `src/App.jsx`. All routes except `/login` are wrapped in `<ProtectedRoute>` → `<Layout>` (sidebar + `<Outlet>`). Dynamic route: `/campaigns/:id`.

### Auth

`src/contexts/AuthContext.jsx` provides `useAuth()` hook → `{ user, loading, signIn, signOut }`. Uses Supabase Auth with email/password. `ProtectedRoute` redirects unauthenticated users to `/login`.

### Service Layer

`src/services/api.js` — all Supabase queries go through service objects: `domainService`, `listService`, `contactService`, `campaignService`, `variantService`, `sendService`, `warmupService`. Each exports CRUD methods. Pattern:
- Throws on error (caller handles with try/catch)
- Pagination via `{ page, limit }` params returning `{ data, count }`
- Related data fetched via Supabase select joins (e.g., `email_campaigns` with `email_domains(domain)`)

### Supabase Client

`src/lib/supabase.js` — singleton client. Falls back to placeholder values if env vars missing (logs warning).

### Styling Convention

**Inline styles with a shared color token object `C`** defined per page file. No CSS modules or styled-components. Dark theme: bg `#09090b`, cards `#18181b`, accent green `#10b981`. Hover states via `onMouseEnter`/`onMouseLeave` + `useState`. Charts use Recharts with custom tooltips matching the theme.

### Database Schema

Migrations in `supabase/migrations/`. Key tables: `email_domains`, `email_lists`, `email_contacts`, `email_campaigns`, `email_variants`, `email_sends`, `warmup_schedule`. Custom enums: `email_verification_status`, `domain_health_status`, `warmup_status`. RLS enabled on all tables with blanket authenticated/service_role access policies.

### n8n Integration

Configured in `.mcp.json`. Workflows handle: email verification (MillionVerifier), AI variant generation (Claude), warmup automation, SES dispatch, and SES webhook processing (bounce/open/click/complaint tracking).

## Key Conventions

- Functional components only, no class components
- No global state library — React Context for auth, local useState for everything else
- Pages are self-contained: data fetching, state, and rendering all in one file
- CSV uploads parsed client-side with PapaParse, stored in Supabase Storage bucket `csv-uploads`
- Icons from `lucide-react`
- Parallel data loading with `Promise.all()` in useEffect
