# 🔥 Survivor Atlas

An interactive world map of every U.S. **Survivor** season — with an immersive page
for every season, a timeline, a hall of champions and a Tribal Council quiz. New
seasons show up on their own, straight from the Survivor Wiki.

## What it does

- **World map** — a satellite map (Esri World Imagery) with a glowing tiki torch at
  every filming location. Fiji, Samoa, Nicaragua and the other repeat hosts collapse
  into medallions until you zoom in. Hover a torch for the season logo and winner.
- **New seasons appear automatically** — on every visit the site asks the
  [Survivor Wiki](https://survivor.fandom.com) whether pages exist past the newest
  bundled season (it checks `Survivor 51`, `Survivor 52`… and follows the "next
  season" link in the latest season's infobox). Anything it finds is added to the
  map, index, timeline, champions hall and quiz — location, air dates, winner,
  tribes and cast all come from the wiki, and the season's colour theme is pulled
  from its logo. Seasons still on air get a **LIVE** badge and pulse on the map;
  once the wiki crowns a winner they join the Hall of Champions. No code changes
  needed.
- **Immersive season pages** — every season has its own palette, display font,
  texture and floating motifs, plus:
  - an ambient particle layer matched to its texture (fireflies in the jungle, rain
    and lightning for storm seasons, bubbles for ocean seasons, petals for China,
    gold glints for the all-star seasons, embers, ash, dust, sand…)
  - a landscape silhouette along the hero for its mood (waves, a smoking volcano,
    a Mayan temple, acacias, outback mesas, jungle canopy…)
  - section frames, corner ornaments, divider rules and scroll-in animations unique
    to each texture (bamboo poles, gilded frames, chiselled stone, rope borders,
    lacquer with key-fret corners…)
  - live stats from the wiki infobox (days, castaways, episodes, tribes) and the
    tribes as buff-style banners
  - castaway cards with finish badges, an in-app "quick look" for any castaway or
    wiki link, a full-screen photo lightbox, a reading-progress fuse and section
    tracking in the sticky nav
- **The Journey** (`#/timeline`) — every season along a torch-lit rope, era by era.
- **Hall of Champions** (`#/champions`) — every Sole Survivor in a gilded frame,
  two-time winners ribboned, with filters and sorting.
- **Tribal Council quiz** (`#/quiz`) — ten questions generated from the season data;
  every miss snuffs a torch. Your best score is remembered.
- **Quality of life** — search everything with `/` or `Ctrl K` (seasons *and* the
  whole wiki), draw a rock for a random season, favourites, "explored" progress,
  shareable links to any season section, working browser back/forward, and
  keyboard shortcuts (press `?`).
- **Radial web view** — the original season "web" is still one key (`V`) away.

## Running it

```bash
npm install
npm run dev      # local dev server
npm run build    # production build → dist/
npm run preview  # serve the production build
```

Pure static site — deploy `dist/` anywhere. Pushes to the deploy branches publish
to GitHub Pages via `.github/workflows/deploy-pages.yml`.

## Stack

- [Vite](https://vite.dev) + React 19 + TypeScript
- [Leaflet](https://leafletjs.com) with Esri World Imagery tiles
- Fandom MediaWiki API (`action=parse`, `pageimages`, `prefixsearch`) with CORS — no API key
- Theming via CSS custom properties — `src/lib/theme.ts` pushes each season's palette
  into `:root`; everything else is CSS

## Structure

```
src/
  data/seasons.ts          # bundled seasons, eras, themes, map clusters
  lib/
    fandom.ts              # Survivor Wiki API client, infobox + cast parsing, sanitizer
    discover.ts            # finds seasons newer than the bundled list
    seasonStore.ts         # live season list (bundled + discovered)
    palette.ts             # season theme from a logo's colours
    router.ts              # hash routes with real history entries
    escape.ts / toast.ts / userData.ts / images.ts / store.ts
  components/
    SurvivorMap.tsx        # Leaflet map, torch pins, clusters, fly-to
    SeasonPage.tsx         # the immersive season page
    Ambience.tsx           # per-texture particle atmosphere
    Horizon.tsx            # per-mood landscape silhouettes
    SeasonWeb.tsx + DetailPanel.tsx   # radial web view
    SeasonIndex.tsx, Dock.tsx, CommandPalette.tsx, WikiPeek.tsx, Lightbox.tsx …
  pages/
    TimelinePage.tsx, ChampionsPage.tsx, QuizPage.tsx
  styles/                  # shell, season page, index drawer, one sheet per page
```

> Fan project. Season data and images belong to the
> [Survivor Wiki](https://survivor.fandom.com) community (CC-BY-SA) and CBS.
> Not affiliated with CBS or Paramount.
