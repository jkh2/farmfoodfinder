import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Types matching our schema
export type Farm = {
  id: string
  name: string
  description: string | null
  lat: number
  lng: number
  address: string | null
  city: string | null
  state: string | null
  zip: string | null
  phone: string | null
  website: string | null
  hours: Record<string, string> | null
  verified: boolean
  created_at: string
}

export type Market = {
  id: string
  name: string
  lat: number
  lng: number
  address: string | null
  city: string | null
  state: string | null
  schedule: { day: string; open: string; close: string }[] | null
  season_start: string | null
  season_end: string | null
  source: string
  created_at: string
}

export type Product = {
  id: string
  name: string
  category: string
  seasonal_months: number[] | null
}

// Query: farms within radius (miles) of a lat/lng point
export async function getFarmsNearby(
  lat: number,
  lng: number,
  radiusMiles: number,
  productCategory?: string
): Promise<Farm[]> {
  const radiusMeters = radiusMiles * 1609.34

  let query = supabase.rpc('farms_within_radius', {
    user_lat: lat,
    user_lng: lng,
    radius_meters: radiusMeters,
  })

  const { data, error } = await query
  if (error) {
    console.error('getFarmsNearby error:', error)
    return []
  }

  return data ?? []
}

// Query: markets within radius
export async function getMarketsNearby(
  lat: number,
  lng: number,
  radiusMiles: number
): Promise<Market[]> {
  const radiusMeters = radiusMiles * 1609.34

  const { data, error } = await supabase.rpc('markets_within_radius', {
    user_lat: lat,
    user_lng: lng,
    radius_meters: radiusMeters,
  })

  if (error) {
    console.error('getMarketsNearby error:', error)
    return []
  }

  return data ?? []
}
