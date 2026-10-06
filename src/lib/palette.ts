import type { SeasonTheme } from '../data/seasons'

type Palette = Pick<SeasonTheme, 'primary' | 'secondary' | 'accent' | 'bg1' | 'bg2'>

function hslToHex(h: number, s: number, l: number): string {
  const hue = ((h % 360) + 360) % 360
  const a = s * Math.min(l, 1 - l)
  const f = (n: number) => {
    const k = (n + hue / 30) % 12
    const c = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))
    return Math.round(c * 255).toString(16).padStart(2, '0')
  }
  return `#${f(0)}${f(8)}${f(4)}`
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255
  g /= 255
  b /= 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  if (max === min) return [0, 0, l]
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  let h: number
  if (max === r) h = (g - b) / d + (g < b ? 6 : 0)
  else if (max === g) h = (b - r) / d + 2
  else h = (r - g) / d + 4
  return [h * 60, s, l]
}

function paletteFromHues(primaryHue: number, secondaryHue: number, accentHue: number): Palette {
  return {
    primary: hslToHex(primaryHue, 0.62, 0.4),
    secondary: hslToHex(secondaryHue, 0.55, 0.38),
    accent: hslToHex(accentHue, 0.9, 0.7),
    bg1: hslToHex(primaryHue, 0.55, 0.06),
    bg2: hslToHex(primaryHue, 0.48, 0.12),
  }
}

/** Deterministic palette for a season number — golden-angle hues never repeat neighbours. */
export function paletteFromSeed(seed: number): Palette {
  const hue = (seed * 137.508) % 360
  return paletteFromHues(hue, hue + 150, hue + 30)
}

/**
 * Pull a palette out of a season logo. Buckets the chromatic pixels by hue,
 * takes the heaviest bucket as the primary and the next distinct one as the
 * secondary. Falls back to the seeded palette when the image can't be read
 * (CORS) or is essentially monochrome.
 */
export async function paletteFromImage(url: string, seed: number): Promise<Palette> {
  try {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.referrerPolicy = 'no-referrer'
    img.decoding = 'async'
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve()
      img.onerror = () => reject(new Error('logo failed to load'))
      img.src = url
    })
    const size = 48
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return paletteFromSeed(seed)
    ctx.drawImage(img, 0, 0, size, size)
    const { data } = ctx.getImageData(0, 0, size, size)

    const BUCKETS = 24
    const weight = new Array<number>(BUCKETS).fill(0)
    const hueSum = new Array<number>(BUCKETS).fill(0)
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] < 200) continue
      const [h, s, l] = rgbToHsl(data[i], data[i + 1], data[i + 2])
      if (s < 0.28 || l < 0.12 || l > 0.9) continue
      const b = Math.floor(h / (360 / BUCKETS)) % BUCKETS
      const w = s * (1 - Math.abs(l - 0.5))
      weight[b] += w
      hueSum[b] += h * w
    }
    const ranked = weight
      .map((w, b) => ({ w, hue: w ? hueSum[b] / w : 0 }))
      .filter(x => x.w > 0)
      .sort((a, b) => b.w - a.w)
    const total = ranked.reduce((sum, x) => sum + x.w, 0)
    if (!ranked.length || total < 20) return paletteFromSeed(seed)

    const primary = ranked[0].hue
    const hueGap = (a: number, b: number) => Math.min(Math.abs(a - b), 360 - Math.abs(a - b))
    const second = ranked.find(x => hueGap(x.hue, primary) > 40 && x.w > total * 0.06)
    const secondary = second ? second.hue : primary + 150
    // a warm-shifted accent reads like firelight against the dark backgrounds
    const accent = second && second.w > total * 0.15 ? secondary : primary + 25
    return paletteFromHues(primary, secondary, accent)
  } catch {
    return paletteFromSeed(seed)
  }
}
