'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import ChatSidebar from '@/components/ChatSidebar'
import { getFarmsNearby, getMarketsNearby, type Farm, type Market } from '@/lib/supabase'

// Leaflet requires browser APIs — load client-side only
const Map = dynamic(() => import('@/components/Map'), { ssr: false })

const RADIUS_OPTIONS = [5, 10, 25, 50]

// Test pin shown until real farm data is in the DB
const makeTestFarm = (lat: number, lng: number): Farm => ({
  id: 'test-1',
  name: 'Sunrise Family Farm (demo)',
  description: 'Fresh eggs, seasonal vegetables, and raw honey.',
  lat: lat + 0.05,
  lng: lng + 0.03,
  address: '123 Farm Road',
  city: 'Your Town',
  state: 'TX',
  zip: '',
  phone: '',
  website: '',
  hours: { sat: '8am–12pm', sun: '10am–2pm' },
  verified: false,
  created_at: new Date().toISOString(),
})

export default function Home() {
  const [userLat, setUserLat] = useState<number | null>(null)
  const [userLng, setUserLng] = useState<number | null>(null)
  const [radiusMiles, setRadiusMiles] = useState(25)
  const [farms, setFarms] = useState<Farm[]>([])
  const [markets, setMarkets] = useState<Market[]>([])
  const [chatOpen, setChatOpen] = useState(false)
  const [selectedFarm, setSelectedFarm] = useState<Farm | null>(null)
  const [geoError, setGeoError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // Get user location
  useEffect(() => {
    if (!navigator.geolocation) {
      setGeoError('Geolocation not supported — using default location.')
      setUserLat(30.2672)
      setUserLng(-97.7431)
      setLoading(false)
      return
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLat(pos.coords.latitude)
        setUserLng(pos.coords.longitude)
        setLoading(false)
      },
      () => {
        setGeoError('Location access denied — using default location.')
        setUserLat(30.2672)
        setUserLng(-97.7431)
        setLoading(false)
      }
    )
  }, [])

  // Fetch farms + markets when location or radius changes
  useEffect(() => {
    if (userLat === null || userLng === null) return

    async function load() {
      const [f, m] = await Promise.all([
        getFarmsNearby(userLat!, userLng!, radiusMiles),
        getMarketsNearby(userLat!, userLng!, radiusMiles),
      ])
      setFarms(f.length === 0 ? [makeTestFarm(userLat!, userLng!)] : f)
      setMarkets(m)
    }

    load()
  }, [userLat, userLng, radiusMiles])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-green-50">
        <div className="text-center">
          <p className="text-2xl mb-2">🌱</p>
          <p className="text-green-800 font-medium">Finding your location...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* Top bar */}
      <header className="bg-green-700 text-white px-4 py-3 flex items-center justify-between shadow-md z-10">
        <div>
          <h1 className="font-bold text-lg leading-none">FarmFoodFinder</h1>
          <p className="text-green-200 text-xs">Fresh food near you</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Radius selector */}
          <div className="flex items-center gap-1 bg-green-800 rounded-lg px-2 py-1">
            {RADIUS_OPTIONS.map((r) => (
              <button
                key={r}
                onClick={() => setRadiusMiles(r)}
                className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${
                  radiusMiles === r
                    ? 'bg-white text-green-800'
                    : 'text-green-200 hover:text-white'
                }`}
              >
                {r}mi
              </button>
            ))}
          </div>

          {/* Legend */}
          <div className="hidden sm:flex items-center gap-2 text-xs text-green-200">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-green-400 inline-block" />
              Farms
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-orange-400 inline-block" />
              Markets
            </span>
          </div>

          {/* AI Chat button */}
          <button
            onClick={() => setChatOpen(true)}
            className="bg-white text-green-700 font-semibold text-sm px-3 py-1.5 rounded-lg hover:bg-green-50 flex items-center gap-1.5"
          >
            <span>🌽</span> Ask AI
          </button>
        </div>
      </header>

      {/* Status bar */}
      <div className="bg-green-50 border-b border-green-100 px-4 py-1.5 text-xs text-green-700 flex items-center justify-between">
        <span>
          {geoError ? (
            <span className="text-amber-600">⚠ {geoError}</span>
          ) : (
            <span>
              <strong>{farms.length}</strong> farm{farms.length !== 1 ? 's' : ''} and{' '}
              <strong>{markets.length}</strong> market{markets.length !== 1 ? 's' : ''} within {radiusMiles} miles
            </span>
          )}
        </span>
        {selectedFarm && (
          <span className="text-green-800 font-medium">📍 {selectedFarm.name}</span>
        )}
      </div>

      {/* Map */}
      <main className="flex-1 relative overflow-hidden">
        {userLat && userLng && (
          <Map
            farms={farms}
            markets={markets}
            userLat={userLat}
            userLng={userLng}
            radiusMiles={radiusMiles}
            onFarmClick={setSelectedFarm}
          />
        )}
      </main>

      {/* Chat sidebar */}
      {userLat && userLng && (
        <ChatSidebar
          userLat={userLat}
          userLng={userLng}
          radiusMiles={radiusMiles}
          isOpen={chatOpen}
          onClose={() => setChatOpen(false)}
        />
      )}
    </div>
  )
}
