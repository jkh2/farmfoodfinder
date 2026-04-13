'use client'

import { useEffect, useRef, useState } from 'react'
import type { Farm, Market } from '@/lib/supabase'

// Leaflet must be imported client-side only (no SSR)
type MapProps = {
  farms: Farm[]
  markets: Market[]
  userLat: number
  userLng: number
  radiusMiles: number
  onFarmClick?: (farm: Farm) => void
  onMarketClick?: (market: Market) => void
}

export default function Map({
  farms,
  markets,
  userLat,
  userLng,
  radiusMiles,
  onFarmClick,
  onMarketClick,
}: MapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const markersRef = useRef<any[]>([])

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return

    // Dynamic import to avoid SSR issues with Leaflet
    import('leaflet').then((L) => {
      // Fix default marker icon paths (Leaflet webpack issue)
      delete (L.Icon.Default.prototype as any)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      })

      const map = L.map(mapRef.current!).setView([userLat, userLng], getZoomForRadius(radiusMiles))

      // OpenStreetMap tiles — free, no API key needed
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map)

      // User location marker
      L.circleMarker([userLat, userLng], {
        radius: 8,
        fillColor: '#3b82f6',
        color: '#1d4ed8',
        weight: 2,
        opacity: 1,
        fillOpacity: 0.8,
      })
        .addTo(map)
        .bindPopup('📍 Your location')

      mapInstanceRef.current = map
    })

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [])

  // Update markers when farms/markets change
  useEffect(() => {
    if (!mapInstanceRef.current) return

    import('leaflet').then((L) => {
      // Clear existing markers
      markersRef.current.forEach((m) => m.remove())
      markersRef.current = []

      // Farm markers — green
      const farmIcon = L.divIcon({
        className: '',
        html: '<div style="background:#16a34a;width:14px;height:14px;border-radius:50%;border:2px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,0.4)"></div>',
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      })

      farms.forEach((farm) => {
        const marker = L.marker([farm.lat, farm.lng], { icon: farmIcon })
          .addTo(mapInstanceRef.current)
          .bindPopup(
            `<strong>${farm.name}</strong><br>${farm.city ?? ''}${farm.state ? `, ${farm.state}` : ''}`
          )

        if (onFarmClick) {
          marker.on('click', () => onFarmClick(farm))
        }

        markersRef.current.push(marker)
      })

      // Market markers — orange
      const marketIcon = L.divIcon({
        className: '',
        html: '<div style="background:#ea580c;width:14px;height:14px;border-radius:50%;border:2px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,0.4)"></div>',
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      })

      markets.forEach((market) => {
        const marker = L.marker([market.lat, market.lng], { icon: marketIcon })
          .addTo(mapInstanceRef.current)
          .bindPopup(
            `<strong>${market.name}</strong><br>${market.city ?? ''}${market.state ? `, ${market.state}` : ''}`
          )

        if (onMarketClick) {
          marker.on('click', () => onMarketClick(market))
        }

        markersRef.current.push(marker)
      })
    })
  }, [farms, markets])

  return (
    <div
      ref={mapRef}
      className="w-full h-full rounded-lg"
      style={{ minHeight: '400px' }}
    />
  )
}

function getZoomForRadius(miles: number): number {
  if (miles <= 5) return 12
  if (miles <= 10) return 11
  if (miles <= 25) return 10
  return 9
}
