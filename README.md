# 🔥 Survivor Atlas

An interactive world map of every U.S. **Survivor** season — 50 seasons, 20 filming
locations, one satellite map.

## What it does

- **World map** — scroll and zoom a real satellite map (Esri World Imagery) with a
  glowing torch pin at every season's filming location. The 18 Fiji-era seasons fan
  out in a ring around the Mamanuca Islands.
- **Fly-in** — click a torch (or pick from the searchable season index) and the camera
  flies to that season's island.
- **The season web** — on arrival, a radial web expands over the map: the season logo
  at the center with animated threads out to Overview, Castaways, The Story, Episodes,
  Voting History, Twists, Trivia, Production, Winner, Photo Gallery, Videos, and the
  full wiki page.
- **Live wiki content** — every node pulls live from the
  [Survivor Wiki](https://survivor.fandom.com) (Fandom MediaWiki API) into a slide-in
  detail panel: cast tables with photos, season summaries, voting history, trivia, and
  image galleries. No API key needed.
- **Full theme takeover** — each season has its own palette and mood; zooming into a
  season re-skins the entire UI (Borneo's jungle greens, Australia's outback rust,
  Winners at War's black-and-gold…).
- **Videos** — curated YouTube reels per season (intro, blindsides, Final Tribal,
  winner moment).

## Running it

```bash
npm install
npm run dev      # local dev server
npm run build    # production build → dist/
npm run preview  # serve the production build
```

Pure static site — deploy `dist/` anywhere (GitHub Pages, Netlify, Vercel…).

## Stack

- [Vite](https://vite.dev) + React 19 + TypeScript
- [Leaflet](https://leafletjs.com) with Esri World Imagery tiles
- Fandom MediaWiki API (`action=parse`, `pageimages`, `generator=images`) with CORS
- Theming via CSS custom properties — `src/lib/theme.ts` pushes each season's palette
  into `:root`, everything else is pure CSS transitions

## Structure

```
src/
  data/seasons.ts        # all 50 seasons: coordinates, winners, taglines, theme palettes
  lib/fandom.ts          # Survivor Wiki API client + HTML sanitizer
  lib/theme.ts           # full-takeover theme engine
  components/
    SurvivorMap.tsx      # Leaflet map, torch pins, fly-to animation
    SeasonWeb.tsx        # the radial content web
    DetailPanel.tsx      # slide-in wiki content panel
    SeasonIndex.tsx      # searchable season drawer
```

> Fan project. Season data and images belong to the
> [Survivor Wiki](https://survivor.fandom.com) community (CC-BY-SA) and CBS.
> Not affiliated with CBS or Paramount.
