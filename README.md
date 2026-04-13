# FarmFoodFinder

Find fresh farm food near you. AI-assisted map of local farms, markets, and what they sell.

## What It Is

A map-based Progressive Web App (PWA) that helps consumers discover local farms and farmers markets within a chosen radius — with an embedded AI assistant to help search, find seasonal produce, and plan farm-to-table meals.

## Stack

- **Next.js 14** (App Router) + TypeScript + Tailwind CSS
- **Supabase** (PostgreSQL + PostGIS for geospatial queries)
- **Leaflet.js** + OpenStreetMap (free map tiles)
- **Claude API** (Anthropic) — embedded AI assistant with tool use
- **Vercel** — hosting

## Getting Started

```bash
npm install
cp .env.local.example .env.local
# Fill in your Supabase and Anthropic API keys
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
ANTHROPIC_API_KEY=
```

## Build Plan

Full build plan: [FarmFoodFinder_BuildPlan.md](https://github.com/jkh2/farmfoodfinder/blob/main/docs/BuildPlan.md)

## License

MIT
