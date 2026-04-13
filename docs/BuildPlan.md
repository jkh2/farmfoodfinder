# FarmFoodFinder — Build Plan
*Created: April 13, 2026 — James Harwood + Claude Sentinel*

## The Problem

Within a 50-mile radius, consumers can't easily find which local farms sell direct to the public, what they carry, or where farmers markets are. Existing solutions (LocalHarvest, USDA directory, EatWild) are outdated, web-only, and have no AI layer. No one has built a clean, map-based, AI-assisted mobile experience for this.

## The Vision

A map-based PWA (Progressive Web App) where consumers find fresh farm food near them — farms, markets, products — and an embedded AI assistant helps them search, plan meals, and discover what's in season. Farmers self-register and manage their own listings. Starts local, expands nationally.

## Working Name

**FarmFoodFinder** (rename before launch — candidates: FarmFind, HarvestMap, LocalRoots, FreshMap)

## Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Frontend | Next.js 14 (App Router) | PWA-capable, Vercel deploy, our proven pattern |
| Styling | Tailwind CSS | Fast, mobile-first |
| Map | Leaflet.js + OpenStreetMap | Free tiles, no API bill surprises |
| Database | Supabase (PostgreSQL + PostGIS) | Geospatial queries, auth, our proven pattern |
| Auth | Supabase Auth | Farmer accounts; consumer optional |
| AI | Claude API (tool use) | Embedded assistant, consistent with our build style |
| Host (MVP) | Vercel | Free tier, GitHub-connected, instant deploy |
| Host (production) | Own domain + server | Phase 4+ |
| Repo | GitHub (public) | jkh2/farmfoodfinder |

## Architecture

```
User (browser / phone as PWA)
    ↓
Next.js 14 App (Vercel)
    ├── Map View (Leaflet + OpenStreetMap tiles)
    ├── Farm profile pages  (/farm/[id])
    ├── Market profile pages  (/market/[id])
    ├── AI Chat Sidebar (Claude API with tool use)
    └── Farmer Dashboard (auth-gated: manage listing, products, photos)
         ↓
Supabase
    ├── PostgreSQL + PostGIS (radius queries)
    ├── Supabase Auth (farmer accounts)
    ├── Storage (farm photos)
    └── Row-Level Security
         ↓
External APIs (data seeding)
    ├── USDA Farmers Market Directory API (public, ~8,600 markets)
    └── OpenFarm.cc API (produce/crop taxonomy, open source)
```

## Database Schema

### Table: farms
```sql
farms (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  description text,
  lat         float8 NOT NULL,
  lng         float8 NOT NULL,
  address     text,
  city        text,
  state       text(2),
  zip         text,
  phone       text,
  website     text,
  hours       jsonb,          -- { mon: "9am-5pm", sat: "8am-12pm", ... }
  owner_id    uuid REFERENCES auth.users,
  verified    boolean DEFAULT false,
  created_at  timestamptz DEFAULT now()
)
```

### Table: markets (farmers markets — seeded from USDA)
```sql
markets (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name         text NOT NULL,
  lat          float8 NOT NULL,
  lng          float8 NOT NULL,
  address      text,
  city         text,
  state        text(2),
  schedule     jsonb,         -- [{ day: "Saturday", open: "8:00", close: "13:00" }]
  season_start date,
  season_end   date,
  source       text DEFAULT 'usda',   -- 'usda' | 'manual'
  external_id  text,          -- USDA market ID
  created_at   timestamptz DEFAULT now()
)
```

### Table: products (taxonomy)
```sql
products (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name             text NOT NULL,
  category         text NOT NULL,
  seasonal_months  int[]    -- array of months (1–12) this is typically in season
)

-- Categories: eggs, beef, pork, poultry, dairy, vegetables,
--             fruit, honey, flowers, herbs, CSA, bread, other
```

### Table: farm_products (junction)
```sql
farm_products (
  farm_id      uuid REFERENCES farms(id) ON DELETE CASCADE,
  product_id   uuid REFERENCES products(id),
  availability text DEFAULT 'year_round',  -- 'year_round' | 'seasonal' | 'limited'
  notes        text,
  PRIMARY KEY (farm_id, product_id)
)
```

### Table: farm_images
```sql
farm_images (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id    uuid REFERENCES farms(id) ON DELETE CASCADE,
  url        text NOT NULL,
  is_primary boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
)
```

### PostGIS Radius Query (core feature)
```sql
-- Find all farms within N miles of a user
SELECT f.*, 
  ST_Distance(
    ST_MakePoint(f.lng, f.lat)::geography,
    ST_MakePoint($user_lng, $user_lat)::geography
  ) / 1609.34 AS distance_miles
FROM farms f
WHERE ST_DWithin(
  ST_MakePoint(f.lng, f.lat)::geography,
  ST_MakePoint($user_lng, $user_lat)::geography,
  $radius_miles * 1609.34
)
ORDER BY distance_miles;
```

## AI Layer — Claude Tool Use

Three tools the assistant calls against live Supabase data:

### Tool 1: find_nearby_farms
```json
{
  "name": "find_nearby_farms",
  "description": "Find farms near a location that sell specific products",
  "input_schema": {
    "lat": "number",
    "lng": "number",
    "radius_miles": "number (default 25)",
    "products": "string[] (optional — filter by category)"
  }
}
```

### Tool 2: find_farmers_markets
```json
{
  "name": "find_farmers_markets",
  "description": "Find farmers markets near a location with schedule info",
  "input_schema": {
    "lat": "number",
    "lng": "number",
    "radius_miles": "number (default 25)",
    "day_of_week": "string (optional — e.g. 'Saturday')"
  }
}
```

### Tool 3: get_seasonal_produce
```json
{
  "name": "get_seasonal_produce",
  "description": "What produce is typically in season right now for a given US state",
  "input_schema": {
    "state": "string (2-letter code)",
    "month": "number (1-12)"
  }
}
```

**AI System Prompt Direction:** The assistant is a knowledgeable local food guide — like a neighbor who knows every farm in the county. Helpful, specific, not a corporate chatbot. Knows what's in season, can plan a meal, can find what you're looking for by distance and product.

## Phase Plan

### Phase 1 — Bones (in progress — April 13, 2026)
- [x] GitHub repo: `jkh2/farmfoodfinder` — created and live
- [x] Next.js 14 project init + TypeScript + Tailwind — scaffolded and pushed
- [x] Dependencies installed: leaflet, @types/leaflet, @supabase/supabase-js, @anthropic-ai/sdk
- [x] README.md, CLAUDE.md, .env.local.example written
- [x] Build plan saved to docs/BuildPlan.md in repo
- [ ] Vercel deploy wired (James: import repo at vercel.com)
- [ ] Supabase project created + PostGIS enabled
- [ ] All 5 tables created with schema above
- [ ] Leaflet map rendering (OpenStreetMap tiles)
- [ ] Geolocation: detect user location → center map
- [ ] Radius selector (5 / 10 / 25 / 50 miles)
- [ ] Dummy farm pin (hardcoded) → validates map + query pipeline end-to-end

**Phase 1 done = the house has a frame, a floor, and a door.**

### Phase 2 — Data + Listings
- [ ] USDA API import script → populate `markets` table
- [ ] Product taxonomy seed (50–100 core products across 10 categories)
- [ ] Farm registration form (public-facing, no account required to submit)
- [ ] Supabase Auth → farmer account creation + login
- [ ] Farm profile page `/farm/[id]`
- [ ] Market profile page `/market/[id]`
- [ ] Map pins from DB (farms = green, markets = orange)
- [ ] Product filter chips on map (filter visible pins by category)

### Phase 3 — AI Layer
- [ ] Claude API wired (claude-haiku-4-5 default; sonnet switchable)
- [ ] Three tools implemented + connected to Supabase queries
- [ ] Chat sidebar component (collapsible drawer on mobile)
- [ ] Context injection: user's current location + radius passed to AI
- [ ] Conversation handles: product search, seasonal advice, meal planning

### Phase 4 — PWA + Production
- [ ] PWA manifest + service worker (installable to phone home screen)
- [ ] Mobile-first responsive audit across all screens
- [ ] Farmer dashboard: edit listing, update products, upload photos
- [ ] Basic SEO + open graph tags for farm profile sharing
- [ ] Custom domain + production Supabase environment
- [ ] About / How It Works page

### Phase 5+ (Post-MVP, not in scope now)
- Marketplace / farm-direct ordering
- Reviews + ratings
- Real-time "available today" inventory
- Native iOS / Android app
- Premium farm listings / featured placement

## What We Do NOT Build in MVP
- Payment processing
- Real-time inventory
- Native app (PWA covers it)
- Reviews / social features

## Data Population Strategy (Secondary Problem — Noted)
- Phase 2 seeds markets from USDA (free, immediate, ~8,600 records)
- Farms require self-registration OR manual entry for target region
- James's local area (50-mile radius) as the first proving ground
- Soft launch → word of mouth to local farmers → expand outward

---

*Plan written April 13, 2026. Build begins Phase 1.*
*Repository: github.com/jkh2/farmfoodfinder (to be created)*
