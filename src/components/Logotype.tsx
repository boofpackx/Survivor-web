/**
 * Carved, fire-lit "SURVIVOR ATLAS" logotype. Pure inline SVG so it themes
 * with the active season via CSS custom properties.
 */
export default function Logotype() {
  return (
    <svg className="logotype" viewBox="0 0 640 96" role="img" aria-label="Survivor Atlas">
      <defs>
        <linearGradient id="fire-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fff3d6" />
          <stop offset="45%" stopColor="var(--th-accent)" />
          <stop offset="100%" stopColor="var(--th-primary)" />
        </linearGradient>
        <filter id="rough" x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" result="n" seed="7" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="1.6" />
        </filter>
        <path id="arc" d="M 40 72 Q 320 30 600 72" fill="none" />
      </defs>

      <g filter="url(#rough)">
        <text className="logotype-main logotype-stroke">
          <textPath href="#arc" startOffset="50%" textAnchor="middle">
            SURVIVOR
          </textPath>
        </text>
        <text className="logotype-main logotype-fill">
          <textPath href="#arc" startOffset="50%" textAnchor="middle">
            SURVIVOR
          </textPath>
        </text>
      </g>

      <g className="logotype-sub">
        <line x1="200" y1="84" x2="268" y2="84" />
        <text x="320" y="89" textAnchor="middle">
          ⋆ A T L A S ⋆
        </text>
        <line x1="372" y1="84" x2="440" y2="84" />
      </g>
    </svg>
  )
}
