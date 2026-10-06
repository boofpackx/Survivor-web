import { useEscape } from '../lib/escape'

const SHORTCUTS: [string[], string][] = [
  [['/', 'Ctrl K'], 'Search seasons, castaways & the whole wiki'],
  [['R'], 'Draw a rock — jump to a random season'],
  [['S'], 'Open the season index'],
  [['M'], 'World map'],
  [['T'], 'The Journey timeline'],
  [['C'], 'Hall of Champions'],
  [['Q'], 'Tribal Council quiz'],
  [['←', '→'], 'Previous / next season (when a season is open)'],
  [['F'], 'Favorite the open season'],
  [['V'], 'Switch season page ↔ web view'],
  [['Esc'], 'Close the top layer'],
  [['?'], 'This help'],
]

export default function HelpOverlay({ onClose }: { onClose: () => void }) {
  useEscape(onClose)
  return (
    <div className="peek-backdrop" data-modal="" onClick={onClose}>
      <div className="help-card" role="dialog" aria-modal="true" aria-label="Keyboard shortcuts" onClick={e => e.stopPropagation()}>
        <button className="peek-btn peek-close help-close" onClick={onClose} aria-label="Close">✕</button>
        <h2>⌨️ Camp Shortcuts</h2>
        <p className="help-sub">Move around the island without lifting your hands.</p>
        <ul className="help-list">
          {SHORTCUTS.map(([keys, label]) => (
            <li key={label}>
              <span className="help-keys">
                {keys.map(k => <kbd key={k}>{k}</kbd>)}
              </span>
              <span>{label}</span>
            </li>
          ))}
        </ul>
        <p className="help-tip">
          Tip: links inside wiki text open right here in a quick-look card. Hold Ctrl/⌘ to open the real wiki instead.
        </p>
      </div>
    </div>
  )
}
