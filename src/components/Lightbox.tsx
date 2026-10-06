import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useEscape } from '../lib/escape'
import { scaledImage } from '../lib/fandom'
import type { GalleryImage } from '../lib/fandom'

interface Props {
  images: GalleryImage[]
  index: number
  onIndex: (i: number) => void
  onClose: () => void
}

/** Full-screen photo viewer: arrow keys, swipe, thumbnail strip. */
export default function Lightbox({ images, index, onIndex, onClose }: Props) {
  const img = images[index]
  const src = scaledImage(img, 1600)
  const [loadedSrc, setLoadedSrc] = useState<string | null>(null)
  const stripRef = useRef<HTMLDivElement>(null)
  const swipeX = useRef<number | null>(null)
  const swiped = useRef(false)
  const count = images.length
  const go = (delta: number) => onIndex((index + delta + count) % count)

  useEscape(onClose)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') onIndex((index - 1 + count) % count)
      else if (e.key === 'ArrowRight') onIndex((index + 1) % count)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [index, count, onIndex])

  // warm the neighbours so arrowing feels instant
  useEffect(() => {
    for (const d of [-1, 1]) {
      const n = images[(index + d + count) % count]
      if (!n) continue
      const pre = new Image()
      pre.referrerPolicy = 'no-referrer'
      pre.src = scaledImage(n, 1600)
    }
    const strip = stripRef.current
    const thumb = strip?.querySelector<HTMLElement>(`[data-i="${index}"]`)
    if (strip && thumb) {
      strip.scrollTo({ left: thumb.offsetLeft - strip.clientWidth / 2 + thumb.clientWidth / 2, behavior: 'smooth' })
    }
  }, [index, images, count])

  return createPortal(
    <div
      className="lightbox"
      data-modal=""
      role="dialog"
      aria-modal="true"
      aria-label={img.title}
      onClick={() => {
        // the click that ends a swipe shouldn't also close the viewer
        if (swiped.current) swiped.current = false
        else onClose()
      }}
      onPointerDown={e => {
        swipeX.current = e.clientX
      }}
      onPointerUp={e => {
        if (swipeX.current === null) return
        const dx = e.clientX - swipeX.current
        swipeX.current = null
        if (Math.abs(dx) > 60) {
          swiped.current = true
          go(dx < 0 ? 1 : -1)
        }
      }}
    >
      <div className="lightbox-top" onClick={e => e.stopPropagation()}>
        <span className="lightbox-count">{index + 1} / {count}</span>
        <a className="lightbox-btn" href={img.url} target="_blank" rel="noopener noreferrer">Original ↗</a>
        <button className="lightbox-btn" onClick={onClose} aria-label="Close">✕</button>
      </div>

      <figure className="lightbox-stage">
        {loadedSrc !== src && <span className="lightbox-spin torch-spinner" aria-hidden="true">🔥</span>}
        <img
          key={src}
          src={src}
          alt={img.title}
          referrerPolicy="no-referrer"
          className={loadedSrc === src ? 'lightbox-img lightbox-img-in' : 'lightbox-img'}
          onLoad={() => setLoadedSrc(src)}
          onClick={e => e.stopPropagation()}
          draggable={false}
        />
        <figcaption onClick={e => e.stopPropagation()}>{img.title}</figcaption>
      </figure>

      {count > 1 && (
        <>
          <button className="lightbox-nav lightbox-prev" aria-label="Previous photo" onClick={e => { e.stopPropagation(); go(-1) }}>‹</button>
          <button className="lightbox-nav lightbox-next" aria-label="Next photo" onClick={e => { e.stopPropagation(); go(1) }}>›</button>
          <div className="lightbox-strip" ref={stripRef} onClick={e => e.stopPropagation()}>
            {images.map((im, i) => (
              <button
                key={im.url}
                data-i={i}
                className={i === index ? 'lightbox-thumb lightbox-thumb-active' : 'lightbox-thumb'}
                onClick={() => onIndex(i)}
                aria-label={im.title}
              >
                <img src={im.thumbUrl} alt="" loading="lazy" referrerPolicy="no-referrer" />
              </button>
            ))}
          </div>
        </>
      )}
    </div>,
    document.body,
  )
}
