import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { Season } from '../data/seasons'
import { CLUSTERS, CLUSTER_BREAK_ZOOM, clusterMembers, placeLabel, winnerLabel } from '../data/seasons'

interface Props {
  seasons: Season[]
  logos: Record<string, string>
  selected: Season | null
  visited: Set<number>
  /** jump straight to a newly selected season instead of flying (page-to-page hops) */
  instant: boolean
  onSelect: (season: Season) => void
  /** fired when the camera has landed on the selected season */
  onArrived: (seasonNumber: number) => void
}

const WORLD_CENTER: L.LatLngExpression = [12, 160]
const WORLD_ZOOM = 3
const SEASON_ZOOM = 11

function esc(text: string): string {
  return text.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)
}

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

interface PinState {
  active: boolean
  visited: boolean
  igniteDelay: number | null
}

function pinIcon(season: Season, { active, visited, igniteDelay }: PinState): L.DivIcon {
  const ignite = igniteDelay !== null ? `--ignite-delay:${igniteDelay.toFixed(2)}s` : ''
  const status = season.status ?? 'complete'
  const classes = [
    'pin',
    active && 'pin-active',
    visited && 'pin-visited',
    igniteDelay !== null && 'pin-born',
    status !== 'complete' && `pin-${status}`,
  ].filter(Boolean).join(' ')
  const tag = status === 'airing' ? '<span class="pin-tag pin-tag-live">LIVE</span>'
    : status === 'upcoming' ? '<span class="pin-tag pin-tag-soon">SOON</span>' : ''
  return L.divIcon({
    className: '',
    html: `
      <div class="${classes}"
           style="--pin-color:${season.theme.primary};--pin-accent:${season.theme.accent};${ignite}">
        ${status === 'airing' ? '<span class="pin-pulse"></span>' : ''}
        ${torchSvg(season.theme.accent, visited && !active)}
        <span class="pin-num">${season.number}</span>
        ${tag}
      </div>`,
    iconSize: [40, 78],
    iconAnchor: [20, 74],
    tooltipAnchor: [0, -74],
  })
}

function tooltipHtml(season: Season, logo: string | undefined): string {
  const status = season.status === 'airing' ? '<span class="pin-tip-live">● On the air now</span>'
    : season.status === 'upcoming' ? '<span class="pin-tip-live">Coming soon</span>' : ''
  return `<div class="pin-tip">
      ${logo ? `<img class="pin-tip-logo" src="${esc(logo)}" alt="" referrerpolicy="no-referrer"/>` : ''}
      <div class="pin-tip-text">
        <strong>S${season.number} · ${esc(season.title)}</strong>
        <span>${esc(placeLabel(season))} · ${esc(season.year)}</span>
        <em>🏆 ${esc(winnerLabel(season))}</em>
        ${status}
      </div>
    </div>`
}

function clusterIcon(label: string, count: number): L.DivIcon {
  const size = count >= 8 ? 96 : 68
  return L.divIcon({
    className: '',
    html: `
      <div class="cluster-medallion ${count >= 8 ? 'cluster-large' : ''}" style="width:${size}px;height:${size}px">
        <span class="cluster-flames">🔥</span>
        <span class="cluster-label">${esc(label)}</span>
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

export default function SurvivorMap({ seasons, logos, selected, visited, instant, onSelect, onArrived }: Props) {
  const mapRef = useRef<L.Map | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const markersRef = useRef<Map<number, L.Marker>>(new Map())
  /** last icon/tooltip we rendered per marker — skip identical rebuilds (they restart the flame) */
  const iconSigRef = useRef<Map<number, string>>(new Map())
  const tipSigRef = useRef<Map<number, string>>(new Map())
  /** markers mid-ignition keep their ceremony icon until this timestamp */
  const igniteUntilRef = useRef<Map<number, number>>(new Map())
  const timersRef = useRef<number[]>([])
  const clusterMarkersRef = useRef<L.Marker[]>([])
  const clusteredRef = useRef<Set<number>>(new Set())
  const syncVisibilityRef = useRef<() => void>(() => {})
  const arcRef = useRef<L.Polyline | null>(null)
  const prevPosRef = useRef<L.LatLng | null>(null)
  const pendingArrivalRef = useRef<(() => void) | null>(null)

  const seasonsRef = useRef(seasons)
  const logosRef = useRef(logos)
  const visitedRef = useRef(visited)
  const selectedRef = useRef(selected)
  const instantRef = useRef(instant)
  const onSelectRef = useRef(onSelect)
  const onArrivedRef = useRef(onArrived)
  useEffect(() => {
    seasonsRef.current = seasons
    logosRef.current = logos
    visitedRef.current = visited
    selectedRef.current = selected
    instantRef.current = instant
    onSelectRef.current = onSelect
    onArrivedRef.current = onArrived
  })

  /** rebuild one marker's icon from current state (no-op if nothing changed) */
  const refreshIcon = (num: number, force = false) => {
    const marker = markersRef.current.get(num)
    const season = seasonsRef.current.find(s => s.number === num)
    if (!marker || !season) return
    if (!force && (igniteUntilRef.current.get(num) ?? 0) > performance.now()) return
    igniteUntilRef.current.delete(num)
    const state: PinState = {
      active: selectedRef.current?.number === num,
      visited: visitedRef.current.has(num),
      igniteDelay: null,
    }
    const sig = `${state.active}|${state.visited}|${season.status}|${season.theme.primary}|${season.theme.accent}`
    if (iconSigRef.current.get(num) === sig) return
    iconSigRef.current.set(num, sig)
    marker.setIcon(pinIcon(season, state))
  }

  // map + tile layers, once
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

    const syncVisibility = () => {
      const zoomedIn = map.getZoom() >= CLUSTER_BREAK_ZOOM
      markersRef.current.forEach((marker, num) => {
        const show = zoomedIn || !clusteredRef.current.has(num)
        if (show && !map.hasLayer(marker)) marker.addTo(map)
        if (!show && map.hasLayer(marker)) marker.remove()
      })
      clusterMarkersRef.current.forEach(marker => {
        if (!zoomedIn && !map.hasLayer(marker)) marker.addTo(map)
        if (zoomedIn && map.hasLayer(marker)) marker.remove()
      })
    }
    syncVisibilityRef.current = syncVisibility
    map.on('zoomend', syncVisibility)
    mapRef.current = map

    const markers = markersRef.current
    const iconSigs = iconSigRef.current
    const tipSigs = tipSigRef.current
    const timers = timersRef.current
    return () => {
      timers.forEach(t => clearTimeout(t))
      timers.length = 0
      map.remove()
      mapRef.current = null
      markers.clear()
      iconSigs.clear()
      tipSigs.clear()
      clusterMarkersRef.current = []
    }
  }, [])

  // markers + cluster medallions follow the (live-updating) season list
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const markers = markersRef.current
    const firstBatch = markers.size === 0

    seasons.forEach((season, i) => {
      if (markers.has(season.number)) return
      // staggered torch-lighting ceremony on first load; late arrivals light on their own
      const delay = firstBatch ? 0.15 + i * 0.045 : 0.3
      const marker = L.marker([season.lat, season.lng], {
        icon: pinIcon(season, {
          active: selectedRef.current?.number === season.number,
          visited: visitedRef.current.has(season.number),
          igniteDelay: delay,
        }),
        riseOnHover: true,
        keyboard: true,
        alt: `Season ${season.number}: ${season.title}`,
      })
        .bindTooltip(tooltipHtml(season, logosRef.current[season.wikiPage]), {
          direction: 'top', opacity: 1, className: 'pin-tooltip',
        })
        .on('click', () => {
          const current = seasonsRef.current.find(s => s.number === season.number)
          if (current) onSelectRef.current(current)
        })
      markers.set(season.number, marker)
      const settleMs = (delay + 0.9) * 1000
      igniteUntilRef.current.set(season.number, performance.now() + settleMs)
      // once ignited, swap in a plain icon so cluster zoom re-adds don't replay the ceremony
      timersRef.current.push(window.setTimeout(() => refreshIcon(season.number, true), settleMs))
    })

    const live = new Set(seasons.map(s => s.number))
    markers.forEach((marker, num) => {
      if (live.has(num)) return
      marker.remove()
      markers.delete(num)
    })

    clusterMarkersRef.current.forEach(m => m.remove())
    clusteredRef.current = new Set()
    clusterMarkersRef.current = CLUSTERS.map(cluster => {
      const members = clusterMembers(cluster, seasons)
      members.forEach(s => clusteredRef.current.add(s.number))
      const bounds = L.latLngBounds(members.map(s => [s.lat, s.lng] as [number, number]))
      return L.marker([cluster.lat, cluster.lng], {
        icon: clusterIcon(cluster.label, members.length),
        zIndexOffset: 1000,
        keyboard: true,
        alt: `${cluster.label}: ${members.length} seasons`,
      }).on('click', () => {
        map.flyToBounds(bounds.pad(0.35), { duration: 1.4, maxZoom: CLUSTER_BREAK_ZOOM + 2 })
      })
    })
    syncVisibilityRef.current()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seasons])

  // icons reflect selection / visited / live status
  useEffect(() => {
    markersRef.current.forEach((_, num) => refreshIcon(num))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seasons, selected, visited])

  // season logos appear in the hover cards once they've loaded
  useEffect(() => {
    markersRef.current.forEach((marker, num) => {
      const season = seasons.find(s => s.number === num)
      if (!season) return
      const logo = logos[season.wikiPage]
      const sig = `${logo ?? ''}|${season.status}|${season.winner}|${season.title}`
      if (tipSigRef.current.get(num) === sig) return
      tipSigRef.current.set(num, sig)
      marker.setTooltipContent(tooltipHtml(season, logo))
    })
  }, [logos, seasons])

  // fly in / out + travel arc when the selection changes
  const selectedNum = selected?.number ?? null
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const season = selectedRef.current

    arcRef.current?.remove()
    arcRef.current = null
    if (pendingArrivalRef.current) {
      map.off('moveend', pendingArrivalRef.current)
      pendingArrivalRef.current = null
    }

    if (!season || season.number !== selectedNum) {
      map.flyTo(WORLD_CENTER, WORLD_ZOOM, { duration: 1.6 })
      return
    }

    const to = L.latLng(season.lat, season.lng)
    const target = L.latLng(season.lat, nearestLng(map.getCenter().lng, season.lng))
    if (instantRef.current) {
      // the full-screen page hides the map — no need to animate behind it
      map.setView(target, SEASON_ZOOM, { animate: false })
      prevPosRef.current = to
      onArrivedRef.current(season.number)
      return
    }

    const from = prevPosRef.current ?? map.getCenter()
    arcRef.current = L.polyline(arcPoints(from, to), {
      className: 'travel-arc',
      color: season.theme.accent,
      weight: 2.5,
      dashArray: '1 9',
      opacity: 0.9,
    }).addTo(map)

    const arrived = () => {
      pendingArrivalRef.current = null
      if (selectedRef.current?.number !== season.number) return
      onArrivedRef.current(season.number)
      // fade the arc out once we've landed
      window.setTimeout(() => {
        arcRef.current?.remove()
        arcRef.current = null
      }, 1200)
    }
    pendingArrivalRef.current = arrived
    map.once('moveend', arrived)
    map.flyTo(target, SEASON_ZOOM, { duration: 2.2 })
    prevPosRef.current = to
  }, [selectedNum])

  return <div ref={containerRef} className="map-root" />
}
