# 🗺️ TravelMap Pro

> Track, visualize and share your world adventures on an interactive map.

![TravelMap Pro](https://img.shields.io/badge/Next.js-14-black?logo=next.js)
![Supabase](https://img.shields.io/badge/Supabase-Database-green?logo=supabase)
![Vercel](https://img.shields.io/badge/Vercel-Deploy-black?logo=vercel)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)

---

## ✨ Features

| Feature | Details |
|---|---|
| 🗺️ **Interactive Map** | Zoomable world map (Leaflet + CartoDB tiles), dark/light mode |
| 📍 **Visit Tracking** | Log visits with photos, dates, ratings, and notes |
| ⚡ **Quick Memory** | Instantly mark a location, fill details later |
| 💜 **Wishlist** | Save dream destinations with priority (high / medium / low) |
| 🏆 **Badges & Stats** | Auto-awarded trophies, continent/world % progress |
| 🎯 **Annual Goals** | Set and track yearly travel objectives |
| 🔗 **Share Links** | Public shareable map URLs with optional stats/badges |
| 🌙 **Dark Mode** | Comfortable night-time navigation |
| 🔐 **Auth** | Email/password + Google + GitHub OAuth |

---

## 🛠️ Tech Stack

- **Frontend**: Next.js 14 (App Router) + TypeScript + Tailwind CSS
- **Map**: Leaflet + React-Leaflet + CartoDB dark tiles
- **Database**: Supabase (PostgreSQL + Row Level Security)
- **Storage**: Supabase Storage (photos)
- **Auth**: Supabase Auth (email, Google, GitHub)
- **Geocoding**: OpenStreetMap Nominatim API (free)
- **Charts**: Recharts
- **State**: Zustand (persisted)
- **Deploy**: Vercel (CDG1 region — Paris)
- **CI/CD**: GitHub Actions

---

## 🚀 Deployment Guide (30 minutes)

### Step 1 — Clone and configure locally

```bash
git clone https://github.com/YOUR_USERNAME/travelmap-pro.git
cd travelmap-pro
npm install
cp .env.local.example .env.local
```

### Step 2 — Create your Supabase project

1. Go to [supabase.com](https://supabase.com) → **New project**
2. Choose a name, password, region (**eu-central-1** for Europe)
3. Wait ~2 minutes for setup

Then run the migration:
```bash
# Option A — Supabase CLI (recommended)
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push

# Option B — Supabase Dashboard
# Go to SQL Editor → paste content of supabase/migrations/001_initial_schema.sql → Run
```

Optional seed data:
```bash
# In SQL Editor, paste and run supabase/seed.sql
```

### Step 3 — Configure environment variables

In `.env.local`, fill in:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Find these values in Supabase Dashboard → **Settings → API**.

### Step 4 — Enable OAuth (optional)

#### Google OAuth
1. [Google Cloud Console](https://console.cloud.google.com) → APIs & Services → Credentials
2. Create OAuth 2.0 Client ID (Web)
3. Authorized redirect URI: `https://xxxx.supabase.co/auth/v1/callback`
4. In Supabase Dashboard → Authentication → Providers → Google → paste Client ID + Secret

#### GitHub OAuth
1. GitHub → Settings → Developer settings → OAuth Apps → New OAuth App
2. Homepage URL: `https://your-app.vercel.app`
3. Authorization callback URL: `https://xxxx.supabase.co/auth/v1/callback`
4. In Supabase → Authentication → Providers → GitHub → paste Client ID + Secret

### Step 5 — Run locally

```bash
npm run dev
# → http://localhost:3000
```

### Step 6 — Deploy to Vercel

#### Option A — Vercel CLI (fastest)
```bash
npm i -g vercel
vercel login
vercel
# Follow prompts, then:
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add SUPABASE_SERVICE_ROLE_KEY
vercel env add NEXT_PUBLIC_APP_URL  # https://your-app.vercel.app
vercel --prod
```

#### Option B — Vercel Dashboard
1. [vercel.com/new](https://vercel.com/new) → Import from GitHub
2. Framework: **Next.js** (auto-detected)
3. Add environment variables (Settings → Environment Variables):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXT_PUBLIC_APP_URL` → your Vercel URL
4. Click **Deploy**

### Step 7 — Update Supabase redirect URLs

In Supabase Dashboard → Authentication → URL Configuration:
- **Site URL**: `https://your-app.vercel.app`
- **Redirect URLs**: add `https://your-app.vercel.app/auth/callback`

### Step 8 — Set up GitHub Actions CI/CD

Add these secrets to your GitHub repo (Settings → Secrets):

| Secret | Where to find |
|---|---|
| `VERCEL_TOKEN` | vercel.com → Account Settings → Tokens |
| `VERCEL_ORG_ID` | vercel.com → Settings → General → Team ID |
| `VERCEL_PROJECT_ID` | vercel.com → Project Settings → General |

Now every push to `main` auto-deploys to production, and PRs get preview deployments.

---

## 📁 Project Structure

```
travelmap-pro/
├── src/
│   ├── app/
│   │   ├── page.tsx                  # Landing page
│   │   ├── layout.tsx                # Root layout
│   │   ├── not-found.tsx
│   │   ├── auth/
│   │   │   ├── login/page.tsx        # Sign in
│   │   │   ├── signup/page.tsx       # Sign up
│   │   │   └── callback/route.ts     # OAuth callback
│   │   ├── dashboard/
│   │   │   ├── layout.tsx            # Sidebar layout (auth protected)
│   │   │   ├── page.tsx              # Main map view
│   │   │   ├── stats/                # Stats & analytics
│   │   │   ├── wishlist/             # Wishlist manager
│   │   │   ├── badges/               # Badges & trophies
│   │   │   ├── share/                # Share link manager
│   │   │   └── settings/             # User settings
│   │   ├── map/[token]/page.tsx      # Public shared map
│   │   └── api/
│   │       ├── visits/route.ts       # Visits CRUD + badge check
│   │       ├── wishlist/route.ts     # Wishlist CRUD
│   │       ├── places/route.ts       # Nominatim geocoding proxy
│   │       └── stats/route.ts        # Aggregated stats
│   ├── components/
│   │   ├── layout/Sidebar.tsx        # Navigation sidebar
│   │   ├── map/
│   │   │   ├── MapWrapper.tsx        # Dynamic import wrapper (SSR bypass)
│   │   │   ├── TravelMap.tsx         # Leaflet map with markers
│   │   │   ├── MapControls.tsx       # Search, filter, dark mode toolbar
│   │   │   ├── VisitPanel.tsx        # Side panel: visit details + edit
│   │   │   └── AddVisitModal.tsx     # Modal: add visit / quick memory / wishlist
│   │   └── stats/QuickStats.tsx      # Top stats bar on map page
│   ├── hooks/index.ts                # useVisits, useWishlist, useStats, etc.
│   ├── lib/
│   │   ├── supabase/client.ts        # Browser Supabase client
│   │   ├── supabase/server.ts        # Server Supabase client
│   │   ├── store.ts                  # Zustand global state
│   │   └── utils.ts                  # Helper functions
│   ├── types/database.ts             # TypeScript types from DB schema
│   └── middleware.ts                 # Auth route protection
├── supabase/
│   ├── migrations/001_initial_schema.sql
│   ├── seed.sql
│   └── config.toml
├── .github/workflows/deploy.yml      # GitHub Actions CI/CD
├── vercel.json
├── tailwind.config.ts
├── next.config.mjs
└── .env.local.example
```

---

## 🗄️ Database Schema

```
profiles          → User profiles (linked to auth.users)
places            → Global place reference data
visits            → User visit records
visit_photos      → Photos attached to visits
wishlist          → Dream destinations
annual_goals      → Yearly travel targets
badge_definitions → Badge catalog (seeded)
user_badges       → Earned badges per user
shared_maps       → Public share links
follows           → Social following graph
```

All tables use **Row Level Security (RLS)** — users can only read/write their own data.

---

## 🔧 Local Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Lint
npm run lint

# Type check
npx tsc --noEmit

# Supabase local (optional)
npx supabase start
npx supabase db reset   # re-run migrations + seed
```

---

## 🗺️ Geocoding

Locations are resolved via **OpenStreetMap Nominatim** (free, no API key needed):
- Search: `GET /api/places?q=Paris`  
- Reverse geocode: done client-side on map click

Rate limit: 1 req/second. For production at scale, consider [Photon](https://photon.komoot.io/) or [LocationIQ](https://locationiq.com/).

---

## 🛣️ Roadmap

- [ ] Country polygon fills (color-coded by visit count)
- [ ] Timeline animation (year-by-year progression)
- [ ] Friend discovery & following
- [ ] Mobile app (Expo)
- [ ] CSV/GPX import
- [ ] AI-powered destination recommendations
- [ ] Offline support (PWA)

---

## 📄 License

MIT — free to use, fork, and build on.

---

Built with ❤️ using Next.js, Supabase & Leaflet.
