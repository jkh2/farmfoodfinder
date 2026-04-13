# FarmFoodFinder — Project Context for Claude

## What This Is

Map-based PWA for finding local farms and farmers markets. Consumers search by radius, filter by product type, and use an AI assistant to find fresh food near them. Farmers self-register and manage listings.

## Stack

- Next.js 14 (App Router), TypeScript, Tailwind CSS
- Supabase (PostgreSQL + PostGIS), Supabase Auth
- Leaflet.js + OpenStreetMap (free tiles — no API key needed)
- Claude API (Anthropic) with tool use — embedded assistant
- Vercel deployment

## Key Files

- `app/` — Next.js App Router pages and layouts
- `app/api/` — API routes (AI assistant endpoint, farm/market queries)
- `components/` — Reusable UI components
- `lib/supabase.ts` — Supabase client
- `lib/anthropic.ts` — Claude API client + tool definitions
- `docs/BuildPlan.md` — Full phase plan

## Database

5 core tables: `farms`, `markets`, `products`, `farm_products`, `farm_images`
PostGIS enabled on Supabase for radius queries.
See BuildPlan.md for full schema.

## AI Layer

Three tools: `find_nearby_farms`, `find_farmers_markets`, `get_seasonal_produce`
All tool calls query Supabase directly. Context: user's current lat/lng + chosen radius.
Model: claude-haiku-4-5 (cost-efficient); sonnet available for complex queries.

## Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
ANTHROPIC_API_KEY
```

## Current Phase

Phase 1 — Bones: scaffold complete, dependencies installed, Supabase schema pending.
