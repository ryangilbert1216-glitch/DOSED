import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import {
  DEFAULT_AVATAR_CROP,
  coverScale,
  cropAvatarToDataUrl,
  type AvatarCrop,
} from '../lib/photo'

const MIN_ZOOM = 1
const MAX_ZOOM = 3
const FALLBACK_VIEWPORT = 280

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
    ...crop,
    panX: Math.min(maxX, Math.max(-maxX, crop.panX)),
    panY: Math.min(maxY, Math.max(-maxY, crop.panY)),
  }
}

export function AvatarCropModal({ image, onCancel, onApply }: Props) {
  const circleRef = useRef<HTMLDivElement>(null)
  const [viewport, setViewport] = useState(FALLBACK_VIEWPORT)
  const [crop, setCrop] = useState<AvatarCrop>(DEFAULT_AVATAR_CROP)
  const dragRef = useRef<{
    startX: number
    startY: number
    panX: number
    panY: number
  } | null>(null)
  const [dragging, setDragging] = useState(false)

  useLayoutEffect(() => {
    const el = circleRef.current
    if (!el) return
    const measure = () => {
      const size = el.getBoundingClientRect().width
      if (size > 0) setViewport(size)
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const imgStyle = useMemo(() => {
    const s = coverScale(image.width, image.height, viewport) * crop.zoom
    return {
      width: image.width * s,
      height: image.height * s,
      transform: `translate(calc(-50% + ${crop.panX}px), calc(-50% + ${crop.panY}px))`,
    }
  }, [image, crop, viewport])

  const setCropClamped = useCallback(
    (next: AvatarCrop) => {
      setCrop(clampPan(next, image.width, image.height, viewport))
    },
    [image.width, image.height, viewport],
  )

  useEffect(() => {
    setCrop((c) => clampPan(c, image.width, image.height, viewport))
  }, [viewport, image.width, image.height])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onCancel])

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      panX: crop.panX,
      panY: crop.panY,
    }
    setDragging(true)
  }

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    if (!drag) return
    setCropClamped({
      ...crop,
      panX: drag.panX + (e.clientX - drag.startX),
      panY: drag.panY + (e.clientY - drag.startY),
    })
  }

  const endDrag = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (dragRef.current) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId)
      } catch {
        /* already released */
      }
    }
    dragRef.current = null
    setDragging(false)
  }

  return (
    <div className="avatar-crop" role="dialog" aria-modal="true" aria-label="Crop profile photo">
      <button type="button" className="avatar-crop-backdrop" aria-label="Cancel" onClick={onCancel} />
      <div className="avatar-crop-panel">
        <header className="avatar-crop-head">
          <h2>Adjust photo</h2>
          <p>Drag to reposition · use zoom to frame inside the circle</p>
        </header>

        <div
          className={`avatar-crop-stage${dragging ? ' is-dragging' : ''}`}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        >
          <div ref={circleRef} className="avatar-crop-circle">
            <img
              src={image.src}
              alt=""
              draggable={false}
              className="avatar-crop-img"
              style={imgStyle}
            />
          </div>
        </div>

        <label className="avatar-crop-zoom">
          <span>Zoom</span>
          <input
            type="range"
            min={MIN_ZOOM}
            max={MAX_ZOOM}
            step={0.01}
            value={crop.zoom}
            onChange={(e) =>
              setCropClamped({
                ...crop,
                zoom: Number(e.target.value),
              })
            }
          />
        </label>

        <div className="avatar-crop-actions">
          <button type="button" className="btn-ghost" onClick={onCancel}>
            Cancel
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={() => {
              try {
                onApply(cropAvatarToDataUrl(image, crop, viewport, 512))
              } catch {
                onCancel()
              }
            }}
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  )
}
