import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { Season } from '../data/seasons'
import { SEASONS } from '../data/seasons'

interface Props {
  selected: Season | null
  onSelect: (season: Season) => void
  /** fired when the fly-in animation for the selected season finishes */
  onArrived: () => void
}

const WORLD_CENTER: L.LatLngExpression = [12, 160]
const WORLD_ZOOM = 3
const SEASON_ZOOM = 11

function pinIcon(season: Season, active: boolean): L.DivIcon {
  return L.divIcon({
    className: '',
    html: `
      <div class="pin ${active ? 'pin-active' : ''}" style="--pin-color:${season.theme.primary};--pin-accent:${season.theme.accent}">
        <span class="pin-flame">🔥</span>
        <span class="pin-num">${season.number}</span>
      </div>`,
    iconSize: [34, 44],
    iconAnchor: [17, 42],
    tooltipAnchor: [0, -44],
  })
}

export default function SurvivorMap({ selected, onSelect, onArrived }: Props) {
  const mapRef = useRef<L.Map | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const markersRef = useRef<Map<number, L.Marker>>(new Map())
  const onSelectRef = useRef(onSelect)
  const onArrivedRef = useRef(onArrived)
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
    // place-name reference layer so the satellite view stays navigable
    L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
      { maxZoom: 17, opacity: 0.85 },
    ).addTo(map)

    for (const season of SEASONS) {
      const marker = L.marker([season.lat, season.lng], {
        icon: pinIcon(season, false),
        riseOnHover: true,
      })
        .addTo(map)
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

    mapRef.current = map
    const markers = markersRef.current
    return () => {
      map.remove()
      mapRef.current = null
      markers.clear()
    }
  }, [])

  // fly in / out when the selection changes
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    markersRef.current.forEach((marker, num) => {
      const season = SEASONS.find(s => s.number === num)!
      marker.setIcon(pinIcon(season, selected?.number === num))
    })

    if (selected) {
      map.once('moveend', () => onArrivedRef.current())
      map.flyTo([selected.lat, selected.lng], SEASON_ZOOM, { duration: 2.2 })
    } else {
      map.flyTo(WORLD_CENTER, WORLD_ZOOM, { duration: 1.6 })
    }
  }, [selected])

  return <div ref={containerRef} className="map-root" />
}
