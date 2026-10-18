import { useRef, useState } from 'react'
import { AvatarCropModal } from './AvatarCropModal'
import { loadImageFromFile } from '../lib/photo'

interface ProfileProps {
  remindersEnabled: boolean
  onRemindersChange: (enabled: boolean) => void
  liveCount: number
  logCount: number
  theme: 'light' | 'dark'
  onThemeChange: (theme: 'light' | 'dark') => void
  displayName: string
  onDisplayNameChange: (name: string) => void
  profilePhoto: string | null
  onProfilePhotoChange: (photo: string | null) => void
  onOpenCalc?: () => void
  accountMode?: 'cloud' | 'guest'
  onSignOut?: () => void
  onClearTracker?: () => void | Promise<void>
}

export function Profile({
  remindersEnabled,
  onRemindersChange,
  liveCount,
  logCount,
  theme,
  onThemeChange,
  displayName,
  onDisplayNameChange,
  profilePhoto,
  onProfilePhotoChange,
  onOpenCalc,
  accountMode = 'guest',
  onSignOut,
  onClearTracker,
}: ProfileProps) {
  const photoInputRef = useRef<HTMLInputElement>(null)
  const [clearStep, setClearStep] = useState<'idle' | 'confirm' | 'working'>('idle')
  const [clearError, setClearError] = useState<string | null>(null)
  const [cropImage, setCropImage] = useState<HTMLImageElement | null>(null)

  return (
    <section className="panel profile-panel">
      <p className="eyebrow">You</p>
      <h2>Profile</h2>
      <p className="muted">
        {accountMode === 'cloud'
          ? 'Photo, name, and reminders sync to your account.'
          : 'Guest mode — data stays on this device until you create an account.'}
      </p>

      <div className="profile-photo-block">
        <button
          type="button"
          className="dash-avatar profile-avatar-lg"
          onClick={() => photoInputRef.current?.click()}
          aria-label="Upload profile photo"
        >
          {profilePhoto ? (
            <img src={profilePhoto} alt="" />
          ) : (
            <span className="dash-avatar-placeholder">
              {(displayName?.trim() || 'Y').charAt(0).toUpperCase()}
            </span>
          )}
        </button>
        <input
          ref={photoInputRef}
          type="file"
          accept="image/*"
          hidden
          onChange={async (e) => {
            const file = e.target.files?.[0]
            e.target.value = ''
            if (!file) return
            try {
              setCropImage(await loadImageFromFile(file))
            } catch {
              /* ignore */
            }
          }}
        />
        <div className="profile-photo-actions">
          <button
            type="button"
            className="btn-secondary"
            onClick={() => photoInputRef.current?.click()}
          >
            Upload photo
          </button>
          {profilePhoto && (
            <button
              type="button"
              className="btn-ghost"
              onClick={() => onProfilePhotoChange(null)}
            >
              Remove
            </button>
          )}
        </div>
      </div>

      <label className="profile-name-field">
        <span>Display name</span>
        <input
          type="text"
          value={displayName === 'Your name' ? '' : displayName}
          onChange={(e) => onDisplayNameChange(e.target.value)}
          placeholder="Your name"
        />
      </label>

      <p className="profile-section-label">Appearance</p>
      <div className="theme-switch" role="group" aria-label="Appearance">
        <button
          type="button"
          className={theme === 'light' ? 'is-active' : ''}
          onClick={() => onThemeChange('light')}
        >
          Light
        </button>
        <button
          type="button"
          className={theme === 'dark' ? 'is-active' : ''}
          onClick={() => onThemeChange('dark')}
        >
          Dark
        </button>
      </div>

      <div className="profile-stats">
        <div>
          <span className="profile-stat-value">{liveCount}</span>
          <span className="profile-stat-label">In fridge</span>
        </div>
        <div>
          <span className="profile-stat-value">{logCount}</span>
          <span className="profile-stat-label">Logged doses</span>
        </div>
      </div>

      <button
        type="button"
        className={`profile-toggle ${remindersEnabled ? 'is-on' : ''}`}
        aria-pressed={remindersEnabled}
        onClick={() => onRemindersChange(!remindersEnabled)}
      >
        <div>
          <strong>Dose reminders</strong>
          <span className="muted block">Notify at scheduled times</span>
        </div>
        <i aria-hidden />
      </button>

      {onOpenCalc && (
        <button type="button" className="btn-secondary btn-wide" onClick={onOpenCalc}>
          Dose calculator
        </button>
      )}

      {onClearTracker && (
        <div className="profile-danger-zone">
          <p className="profile-section-label">Data</p>
          {clearStep === 'idle' && (
            <button
              type="button"
              className="btn-danger-ghost btn-wide"
              onClick={() => {
                setClearError(null)
                setClearStep('confirm')
              }}
            >
              Clear vials & protocols
            </button>
          )}
          {clearStep === 'confirm' && (
            <div className="profile-clear-confirm">
              <p>
                This permanently removes all vials, protocols, and dose history.
                Your name, photo, and account stay.
              </p>
              {clearError && (
                <p className="profile-clear-error" role="alert">
                  {clearError}
                </p>
              )}
              <div className="profile-clear-actions">
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => {
                    setClearStep('idle')
                    setClearError(null)
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn-danger-ghost"
                  onClick={() => {
                    setClearStep('working')
                    setClearError(null)
                    void (async () => {
                      try {
                        await onClearTracker()
                        setClearStep('idle')
                      } catch {
                        setClearError('Couldn’t clear data. Try again.')
                        setClearStep('confirm')
                      }
                    })()
                  }}
                >
                  Yes, clear everything
                </button>
              </div>
            </div>
          )}
          {clearStep === 'working' && (
            <p className="muted profile-clear-working">Clearing vials & protocols…</p>
          )}
        </div>
      )}

      {onSignOut && (
        <button type="button" className="btn-ghost btn-wide profile-signout" onClick={onSignOut}>
          {accountMode === 'cloud' ? 'Sign out' : 'Leave guest session'}
        </button>
      )}

      {cropImage && (
        <AvatarCropModal
          image={cropImage}
          onCancel={() => setCropImage(null)}
          onApply={(dataUrl) => {
            onProfilePhotoChange(dataUrl)
            setCropImage(null)
          }}
        />
      )}
    </section>
  )
}
