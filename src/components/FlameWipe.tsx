interface Props {
  onDone: () => void
}

/** Fire-ring burst that plays the moment a season web opens. */
export default function FlameWipe({ onDone }: Props) {
  return (
    <div
      className="flame-wipe"
      // animationend bubbles from the rings/flash — only the container's own
      // wipe-hold sentinel (the longest animation) should end the overlay
      onAnimationEnd={e => {
        if (e.target === e.currentTarget && e.animationName === 'wipe-hold') onDone()
      }}
      aria-hidden="true"
    >
      <div className="flame-wipe-ring" />
      <div className="flame-wipe-ring flame-wipe-ring2" />
      <div className="flame-wipe-flash" />
    </div>
  )
}
