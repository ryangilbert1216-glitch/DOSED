import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
} from 'react'
import {
  DEFAULT_AVATAR_CROP,
  coverScale,
  cropAvatarToDataUrl,
  type AvatarCrop,
} from '../lib/photo'

const MIN_ZOOM = 1
const MAX_ZOOM = 4
const FALLBACK_VIEWPORT = 320

type Props = {
  image: HTMLImageElement
  onCancel: () => void
  onApply: (dataUrl: string) => void
}

function clampPan(
  crop: AvatarCrop,
  imgW: number,
  imgH: number,
  viewport: number,
): AvatarCrop {
  const s = coverScale(imgW, imgH, viewport) * crop.zoom
  const maxX = Math.max(0, (imgW * s - viewport) / 2)
  const maxY = Math.max(0, (imgH * s - viewport) / 2)
  return {
    zoom: Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, crop.zoom)),
    panX: Math.min(maxX, Math.max(-maxX, crop.panX)),
    panY: Math.min(maxY, Math.max(-maxY, crop.panY)),
  }
}

function distance(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

export function AvatarCropModal({ image, onCancel, onApply }: Props) {
  const frameRef = useRef<HTMLDivElement>(null)
  const cropRef = useRef<AvatarCrop>(DEFAULT_AVATAR_CROP)
  const [viewport, setViewport] = useState(FALLBACK_VIEWPORT)
  const [crop, setCrop] = useState<AvatarCrop>(DEFAULT_AVATAR_CROP)
  const pointers = useRef(
    new Map<number, { x: number; y: number }>(),
  )
  const gesture = useRef<{
    mode: 'pan' | 'pinch'
    startCrop: AvatarCrop
    originA?: { x: number; y: number }
    originB?: { x: number; y: number }
    startDist?: number
  } | null>(null)

  const commitCrop = useCallback(
    (next: AvatarCrop) => {
      const clamped = clampPan(next, image.width, image.height, viewport)
      cropRef.current = clamped
      setCrop(clamped)
    },
    [image.width, image.height, viewport],
  )

  useLayoutEffect(() => {
    const el = frameRef.current
    if (!el) return
    const measure = () => {
      const size = Math.min(el.clientWidth, el.clientHeight)
      if (size > 0) setViewport(size)
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    commitCrop(cropRef.current)
  }, [viewport, commitCrop])

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [onCancel])

  const imgStyle = useMemo(() => {
    const s = coverScale(image.width, image.height, viewport) * crop.zoom
    return {
      width: image.width * s,
      height: image.height * s,
      transform: `translate(calc(-50% + ${crop.panX}px), calc(-50% + ${crop.panY}px))`,
    }
  }, [image, crop, viewport])

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    const pts = [...pointers.current.values()]
    if (pts.length >= 2) {
      gesture.current = {
        mode: 'pinch',
        startCrop: { ...cropRef.current },
        originA: pts[0],
        originB: pts[1],
        startDist: distance(pts[0], pts[1]),
      }
    } else {
      gesture.current = {
        mode: 'pan',
        startCrop: { ...cropRef.current },
        originA: pts[0],
      }
    }
  }

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!pointers.current.has(e.pointerId)) return
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    const g = gesture.current
    if (!g) return
    const pts = [...pointers.current.values()]

    if (pts.length >= 2) {
      const dist = distance(pts[0], pts[1])
      if (g.mode !== 'pinch' || !g.startDist) {
        gesture.current = {
          mode: 'pinch',
          startCrop: { ...cropRef.current },
          originA: pts[0],
          originB: pts[1],
          startDist: dist,
        }
        return
      }
      const zoom = g.startCrop.zoom * (dist / g.startDist)
      commitCrop({ ...g.startCrop, zoom })
      return
    }

    if (g.mode === 'pan' && g.originA && pts[0]) {
      commitCrop({
        ...g.startCrop,
        panX: g.startCrop.panX + (pts[0].x - g.originA.x),
        panY: g.startCrop.panY + (pts[0].y - g.originA.y),
      })
    }
  }

  const endPointer = (e: ReactPointerEvent<HTMLDivElement>) => {
    pointers.current.delete(e.pointerId)
    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    } catch {
      /* already released */
    }
    const pts = [...pointers.current.values()]
    if (pts.length === 1) {
      gesture.current = {
        mode: 'pan',
        startCrop: { ...cropRef.current },
        originA: pts[0],
      }
    } else if (pts.length === 0) {
      gesture.current = null
    }
  }

  const onWheel = (e: ReactWheelEvent) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? -0.08 : 0.08
    commitCrop({
      ...cropRef.current,
      zoom: cropRef.current.zoom + delta,
    })
  }

  return (
    <div className="ig-crop" role="dialog" aria-modal="true" aria-label="Crop profile photo">
      <header className="ig-crop-bar">
        <button type="button" className="ig-crop-bar-btn" onClick={onCancel}>
          Cancel
        </button>
        <span className="ig-crop-bar-title">Move and scale</span>
        <button
          type="button"
          className="ig-crop-bar-btn ig-crop-bar-done"
          onClick={() => {
            try {
              onApply(cropAvatarToDataUrl(image, cropRef.current, viewport, 512))
            } catch {
              onCancel()
            }
          }}
        >
          Done
        </button>
      </header>

      <div
        className="ig-crop-stage"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endPointer}
        onPointerCancel={endPointer}
        onWheel={onWheel}
      >
        <div ref={frameRef} className="ig-crop-frame">
          <img
            src={image.src}
            alt=""
            draggable={false}
            className="ig-crop-img"
            style={imgStyle}
          />
          <div className="ig-crop-veil" aria-hidden>
            <div className="ig-crop-hole" />
          </div>
          <div className="ig-crop-ring" aria-hidden />
        </div>
      </div>

      <p className="ig-crop-hint">Pinch to zoom · drag to move</p>
    </div>
  )
}
