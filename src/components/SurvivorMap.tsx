import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { Season } from '../data/seasons'
import { CLUSTERS, CLUSTER_BREAK_ZOOM, SEASONS } from '../data/seasons'

interface Props {
  selected: Season | null
  visited: Set<number>
  onSelect: (season: Season) => void
  /** fired when the fly-in animation for the selected season finishes */
  onArrived: () => void
}

const WORLD_CENTER: L.LatLngExpression = [12, 160]
const WORLD_ZOOM = 3
const SEASON_ZOOM = 11

const CLUSTERED_SEASONS = new Set(CLUSTERS.flatMap(c => c.seasons))

/** Hand-drawn tiki torch: bamboo pole, rope wrap, layered animated flame. */
function torchSvg(accent: string, visited: boolean): string {
  const flame = visited
    ? `<g class="torch-flame torch-ember">
         <ellipse cx="20" cy="16" rx="4.5" ry="5" fill="${accent}" opacity="0.55"/>
         <ellipse cx="20" cy="17" rx="2.4" ry="2.8" fill="#ff9d4d" opacity="0.8"/>
       </g>
       <g class="torch-smoke">
         <circle cx="20" cy="8" r="2.2" fill="#9e9e9e" opacity="0.35"/>
         <circle cx="22" cy="4" r="1.6" fill="#bdbdbd" opacity="0.25"/>
       </g>`
    : `<g class="torch-flame">
         <path d="M20 2 C24 8 27 11 26 16 C25 20 22.5 22 20 22 C17.5 22 15 20 14 16 C13 11 16 8 20 2 Z" fill="#ff6d00" opacity="0.92"/>
         <path d="M20 7 C22.5 10.5 24 12.5 23.4 15.6 C22.8 18.2 21.4 19.4 20 19.4 C18.6 19.4 17.2 18.2 16.6 15.6 C16 12.5 17.5 10.5 20 7 Z" fill="#ffab40"/>
         <path d="M20 11 C21.4 13 22 14.2 21.6 16 C21.2 17.4 20.7 18 20 18 C19.3 18 18.8 17.4 18.4 16 C18 14.2 18.6 13 20 11 Z" fill="#fff59d"/>
       </g>`
  return `
  <svg class="torch-svg" viewBox="0 0 40 74" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="glow" cx="50%" cy="25%" r="55%">
        <stop offset="0%" stop-color="${accent}" stop-opacity="0.55"/>
        <stop offset="100%" stop-color="${accent}" stop-opacity="0"/>
      </radialGradient>
    </defs>
    ${visited ? '' : '<circle cx="20" cy="14" r="14" fill="url(#glow)"/>'}
    ${flame}
    <path d="M16.5 21 L23.5 21 L22.5 30 L17.5 30 Z" fill="#4e342e"/>
    <path d="M17.5 30 L22.5 30 L21.3 56 L18.7 56 Z" fill="#6d4c41"/>
    <path d="M18.1 33 L21.9 33 L21.9 35 L18.1 35 Z M18 38 L22 38 L22 40 L18 40 Z" fill="#8d6e63"/>
    <path d="M17 29 L23 29 L23 31.6 L17 31.6 Z" fill="#a1887f"/>
    <path d="M20 56 L20 60" stroke="#3e2723" stroke-width="2.6" stroke-linecap="round"/>
  </svg>`
}

function pinIcon(season: Season, active: boolean, visited: boolean): L.DivIcon {
  return L.divIcon({
    className: '',
    html: `
      <div class="pin ${active ? 'pin-active' : ''} ${visited ? 'pin-visited' : ''}"
           style="--pin-color:${season.theme.primary};--pin-accent:${season.theme.accent}">
        ${torchSvg(season.theme.accent, visited && !active)}
        <span class="pin-num">${season.number}</span>
      </div>`,
    iconSize: [40, 78],
    iconAnchor: [20, 74],
    tooltipAnchor: [0, -74],
  })
}

function clusterIcon(label: string, count: number): L.DivIcon {
  const size = count >= 8 ? 96 : 68
  return L.divIcon({
    className: '',
    html: `
      <div class="cluster-medallion ${count >= 8 ? 'cluster-large' : ''}" style="width:${size}px;height:${size}px">
        <span class="cluster-flames">🔥</span>
        <span class="cluster-label">${label}</span>
        <span class="cluster-count">${count}</span>
      </div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  })
}

/** shift lng by ±360 so the arc doesn't streak across the antimeridian */
function nearestLng(from: number, to: number): number {
  let t = to
  while (t - from > 180) t -= 360
  while (t - from < -180) t += 360
  return t
}

function arcPoints(from: L.LatLng, to: L.LatLng): L.LatLng[] {
  const toLng = nearestLng(from.lng, to.lng)
  const midLat = (from.lat + to.lat) / 2
  const midLng = (from.lng + toLng) / 2
  const dist = Math.hypot(to.lat - from.lat, toLng - from.lng)
  const lift = Math.min(18, dist * 0.22)
  const ctrl = L.latLng(midLat + lift, midLng)
  const pts: L.LatLng[] = []
  for (let i = 0; i <= 48; i++) {
    const t = i / 48
    const lat = (1 - t) ** 2 * from.lat + 2 * (1 - t) * t * ctrl.lat + t ** 2 * to.lat
    const lng = (1 - t) ** 2 * from.lng + 2 * (1 - t) * t * ctrl.lng + t ** 2 * toLng
    pts.push(L.latLng(lat, lng))
  }
  return pts
}

export default function SurvivorMap({ selected, visited, onSelect, onArrived }: Props) {
  const mapRef = useRef<L.Map | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const markersRef = useRef<Map<number, L.Marker>>(new Map())
  const clusterMarkersRef = useRef<L.Marker[]>([])
  const arcRef = useRef<L.Polyline | null>(null)
  const prevPosRef = useRef<L.LatLng | null>(null)
  const visitedRef = useRef(visited)
  const selectedRef = useRef(selected)
  const onSelectRef = useRef(onSelect)
  const onArrivedRef = useRef(onArrived)
  visitedRef.current = visited
  selectedRef.current = selected
  onSelectRef.current = onSelect
  onArrivedRef.current = onArrived

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const map = L.map(containerRef.current, {
      center: WORLD_CENTER,
      zoom: WORLD_ZOOM,
      minZoom: 2,
      maxZoom: 15,
      worldCopyJump: true,
      zoomControl: false,
    })
    L.control.zoom({ position: 'bottomright' }).addTo(map)

    L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      {
        attribution:
          'Imagery &copy; Esri, Maxar, Earthstar Geographics | Content &copy; <a href="https://survivor.fandom.com">Survivor Wiki</a> (CC-BY-SA)',
        maxZoom: 17,
      },
    ).addTo(map)
    L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
      { maxZoom: 17, opacity: 0.85 },
    ).addTo(map)

    for (const season of SEASONS) {
      const marker = L.marker([season.lat, season.lng], {
        icon: pinIcon(season, false, visitedRef.current.has(season.number)),
        riseOnHover: true,
      })
        .bindTooltip(
          `<div class="pin-tip">
             <strong>S${season.number} · ${season.title}</strong>
             <span>${season.location}, ${season.country} · ${season.year}</span>
             <em>Sole Survivor: ${season.winner}</em>
           </div>`,
          { direction: 'top', opacity: 1, className: 'pin-tooltip' },
        )
        .on('click', () => onSelectRef.current(season))
      markersRef.current.set(season.number, marker)
    }

    for (const cluster of CLUSTERS) {
      const members = SEASONS.filter(s => cluster.seasons.includes(s.number))
      const bounds = L.latLngBounds(members.map(s => [s.lat, s.lng] as [number, number]))
      const marker = L.marker([cluster.lat, cluster.lng], {
        icon: clusterIcon(cluster.label, cluster.seasons.length),
        zIndexOffset: 1000,
      }).on('click', () => {
        map.flyToBounds(bounds.pad(0.35), {
          duration: 1.4,
          maxZoom: CLUSTER_BREAK_ZOOM + 2,
        })
      })
      clusterMarkersRef.current.push(marker)
    }

    const syncMarkers = () => {
      const zoomedIn = map.getZoom() >= CLUSTER_BREAK_ZOOM
      markersRef.current.forEach((marker, num) => {
        const show = zoomedIn || !CLUSTERED_SEASONS.has(num)
        if (show && !map.hasLayer(marker)) marker.addTo(map)
        if (!show && map.hasLayer(marker)) marker.remove()
      })
      clusterMarkersRef.current.forEach(marker => {
        if (!zoomedIn && !map.hasLayer(marker)) marker.addTo(map)
        if (zoomedIn && map.hasLayer(marker)) marker.remove()
      })
    }
    map.on('zoomend', syncMarkers)
    syncMarkers()

    mapRef.current = map
    const markers = markersRef.current
    const clusterMarkers = clusterMarkersRef.current
    return () => {
      map.remove()
      mapRef.current = null
      markers.clear()
      clusterMarkers.length = 0
    }
  }, [])

  // fly in / out + travel arc when the selection changes
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    markersRef.current.forEach((marker, num) => {
      const season = SEASONS.find(s => s.number === num)!
      marker.setIcon(pinIcon(season, selected?.number === num, visited.has(num)))
    })

    arcRef.current?.remove()
    arcRef.current = null

    if (selected) {
      const from = prevPosRef.current ?? map.getCenter()
      const to = L.latLng(selected.lat, selected.lng)
      const pts = arcPoints(from, to)
      arcRef.current = L.polyline(pts, {
        className: 'travel-arc',
        color: selected.theme.accent,
        weight: 2.5,
        dashArray: '1 9',
        opacity: 0.9,
      }).addTo(map)

      map.once('moveend', () => {
        onArrivedRef.current()
        // fade the arc out once we've landed
        setTimeout(() => {
          arcRef.current?.remove()
          arcRef.current = null
        }, 1200)
      })
      const target = L.latLng(selected.lat, nearestLng(map.getCenter().lng, selected.lng))
      map.flyTo(target, SEASON_ZOOM, { duration: 2.2 })
      prevPosRef.current = to
    } else {
      map.flyTo(WORLD_CENTER, WORLD_ZOOM, { duration: 1.6 })
    }
  }, [selected, visited])

  return <div ref={containerRef} className="map-root" />
}
