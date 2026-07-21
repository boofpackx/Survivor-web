import type { SeasonTheme } from '../data/seasons'
import { DEFAULT_THEME, FONT_STACKS } from '../data/seasons'

/**
 * Full-takeover theming: pushes the active season's palette, display font and
 * texture into CSS custom properties on <html>, so every component (header,
 * map tint, season page, panels) re-skins itself with pure CSS transitions.
 */
export function applyTheme(theme: SeasonTheme | null): void {
  const th = theme ?? DEFAULT_THEME
  const root = document.documentElement
  root.style.setProperty('--th-primary', th.primary)
  root.style.setProperty('--th-secondary', th.secondary)
  root.style.setProperty('--th-accent', th.accent)
  root.style.setProperty('--th-bg1', th.bg1)
  root.style.setProperty('--th-bg2', th.bg2)
  root.style.setProperty('--th-text', th.text)
  root.style.setProperty('--th-glow', `${th.accent}66`)
  root.style.setProperty('--th-primary-soft', `${th.primary}33`)
  root.style.setProperty('--th-accent-soft', `${th.accent}22`)
  root.style.setProperty('--font-display', FONT_STACKS[th.font])
  root.dataset.mood = th.mood
  root.dataset.texture = th.texture
}
