import { useEffect, useRef } from 'react'

/** Once-per-session title card: torches ignite, the motto burns in, the map is revealed. */
export default function IntroSplash({ onDone, seasons }: { onDone: () => void; seasons: number }) {
  const doneRef = useRef(onDone)
  useEffect(() => {
    doneRef.current = onDone
  })
  useEffect(() => {
    const finish = () => doneRef.current()
    const timer = setTimeout(finish, 3000)
    window.addEventListener('keydown', finish)
    return () => {
      clearTimeout(timer)
      window.removeEventListener('keydown', finish)
    }
  }, [])

  return (
    <div className="intro" onClick={onDone} aria-hidden="true">
      <div className="intro-glow" />
      <span className="css-flame intro-torch intro-torch-l"><i /><i /><i /></span>
      <span className="css-flame intro-torch intro-torch-r"><i /><i /><i /></span>
      <div className="intro-center">
        <p className="intro-motto">
          <span>Outwit</span>
          <span className="intro-dot">·</span>
          <span>Outplay</span>
          <span className="intro-dot">·</span>
          <span>Outlast</span>
        </p>
        <h1 className="intro-title">Survivor <em>Atlas</em></h1>
        <p className="intro-sub">{seasons} seasons · one island chain of stories</p>
      </div>
      <span className="intro-skip">click or press any key</span>
    </div>
  )
}
