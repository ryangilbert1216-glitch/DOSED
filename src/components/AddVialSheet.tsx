import { useRef } from 'react'

type Props = {
  open: boolean
  busy: boolean
  error: string | null
  preview: string | null
  canPhoto: boolean
  onClose: () => void
  onManual: () => void
  onPhoto: (file: File) => void
}

export function AddVialSheet({
  open,
  busy,
  error,
  preview,
  canPhoto,
  onClose,
  onManual,
  onPhoto,
}: Props) {
  const cameraRef = useRef<HTMLInputElement>(null)
  const libraryRef = useRef<HTMLInputElement>(null)
  if (!open) return null

  return (
    <div className="add-sheet" role="dialog" aria-modal="true" aria-label="Add a vial">
      <button type="button" className="add-sheet-backdrop" aria-label="Close" onClick={busy ? undefined : onClose} />
      <div className="add-sheet-panel">
        <div className="add-sheet-grab" aria-hidden />
        <h2>Add a vial</h2>
        <p>Photo import reads the label. Nothing is saved until you tap Save.</p>

        {preview && (
          <img className="add-sheet-preview" src={preview} alt="" />
        )}
        {busy && <p className="add-sheet-status">Reading the label…</p>}
        {error && (
          <p className="add-sheet-error" role="alert">
            {error}
          </p>
        )}

        <button
          type="button"
          className="btn-primary btn-wide"
          disabled={busy || !canPhoto}
          onClick={() => cameraRef.current?.click()}
        >
          Take photo
        </button>
        <button
          type="button"
          className="btn-secondary btn-wide"
          disabled={busy || !canPhoto}
          onClick={() => libraryRef.current?.click()}
        >
          Upload photo
        </button>
        {!canPhoto && (
          <p className="add-sheet-note">Sign in to import a photo of a vial.</p>
        )}
        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          hidden
          onChange={(event) => {
            const file = event.target.files?.[0]
            event.target.value = ''
            if (file) onPhoto(file)
          }}
        />
        <input
          ref={libraryRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(event) => {
            const file = event.target.files?.[0]
            event.target.value = ''
            if (file) onPhoto(file)
          }}
        />
        <button type="button" className="btn-secondary btn-wide" disabled={busy} onClick={onManual}>
          Enter manually
        </button>
        <button type="button" className="btn-ghost btn-wide" disabled={busy} onClick={onClose}>
          Cancel
        </button>
      </div>
    </div>
  )
}
