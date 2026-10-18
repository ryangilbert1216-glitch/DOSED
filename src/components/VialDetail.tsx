import { useEffect, useRef, useState } from 'react'
import type { DoseUnit, Frequency, Peptide, SyringeSize } from '../types'
import {
  concentrationMcgPerMl,
  drawUpSummary,
  formatUnits,
  unitsForDose,
} from '../lib/calc'
import { SyringeGuide } from './SyringeGuide'
import { Vial } from './Vial'

interface VialDetailProps {
  peptide: Peptide
  isNew?: boolean
  onSave: (p: Peptide) => void
  onCancel: () => void
  onDelete?: () => void
  onLog: () => void
}

const FREQ: { value: Frequency; label: string }[] = [
  { value: 'daily', label: 'Daily' },
  { value: 'eod', label: 'Every other day' },
  { value: 'twice_weekly', label: 'Twice weekly' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'custom', label: 'Custom' },
]

const SYRINGES: { value: SyringeSize; label: string }[] = [
  { value: 30, label: '30 units' },
  { value: 50, label: '50 units' },
  { value: 100, label: '100 units' },
]

export function VialDetail({
  peptide,
  isNew = false,
  onSave,
  onCancel,
  onDelete,
  onLog,
}: VialDetailProps) {
  const [draft, setDraft] = useState(peptide)
  const [sitesText, setSitesText] = useState(peptide.injectionSites.join(', '))
  const [loggedFlash, setLoggedFlash] = useState(false)
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setDraft(peptide)
    setSitesText(peptide.injectionSites.join(', '))
  }, [peptide.id]) // reset only when a different vial opens

  const units = unitsForDose(
    draft.vialMg,
    draft.diluentMl,
    draft.doseAmount,
    draft.doseUnit,
  )
  const conc = concentrationMcgPerMl(draft.vialMg, draft.diluentMl)

  const set = <K extends keyof Peptide>(key: K, value: Peptide[K]) =>
    setDraft((current) => ({ ...current, [key]: value }))

  const save = () => {
    const sites = sitesText
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
    onSave({
      ...draft,
      injectionSites: sites.length > 0 ? sites : ['Abdomen'],
    })
  }

  const handleLog = () => {
    onLog()
    setLoggedFlash(true)
    if (flashTimer.current) clearTimeout(flashTimer.current)
    flashTimer.current = setTimeout(() => setLoggedFlash(false), 1400)
  }

  return (
    <aside className="detail-panel" aria-label={`${draft.name || 'Vial'} details`}>
      <div className="detail-top">
        <button
          type="button"
          className="detail-close"
          onClick={onCancel}
          aria-label="Close without saving"
        >
          <svg viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
        <span className="detail-top-title">{isNew ? 'New vial' : 'Edit vial'}</span>
        <div className="detail-top-actions">
          {!isNew && onDelete && (
            <button
              type="button"
              className="detail-trash"
              onClick={onDelete}
              aria-label="Delete vial"
            >
              <svg viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d="M4 7h16M9 7V5h6v2M8 7l.8 12h6.4L16 7"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          )}
          <button type="button" className="detail-save" onClick={save}>
            Save
          </button>
        </div>
      </div>

      <div className="detail-vial-hero">
        <Vial
          name={draft.name}
          doseAmount={draft.vialMg}
          doseUnit="mg"
          size="lg"
        />
      </div>

      <input
        className="detail-name"
        value={draft.name}
        placeholder="Peptide name"
        autoFocus={!draft.name.trim()}
        onChange={(e) => set('name', e.target.value)}
      />

      <SyringeGuide
        units={units}
        syringeUnits={draft.syringeUnits ?? 100}
        accent={draft.color || '#fe1700'}
      />

      <div className="detail-section">
        <p className="detail-section-title">Vial</p>
        <div className="field-grid">
          <label>
            Contents (mg / IU)
            <input
              type="number"
              min={0}
              step="any"
              value={draft.vialMg}
              onChange={(e) => set('vialMg', Number(e.target.value))}
            />
          </label>
          <label>
            BAC water (mL)
            <input
              type="number"
              min={0}
              step="any"
              value={draft.diluentMl}
              onChange={(e) => set('diluentMl', Number(e.target.value))}
            />
          </label>
        </div>
      </div>

      <div className="detail-section">
        <p className="detail-section-title">Dose</p>
        <div className="field-grid">
          <label>
            Amount
            <input
              type="number"
              min={0}
              step="any"
              value={draft.doseAmount}
              onChange={(e) => set('doseAmount', Number(e.target.value))}
            />
          </label>
          <label>
            Unit
            <select
              value={draft.doseUnit}
              onChange={(e) => set('doseUnit', e.target.value as DoseUnit)}
            >
              <option value="mcg">mcg</option>
              <option value="mg">mg</option>
              <option value="iu">IU</option>
            </select>
          </label>
          <label className="span-2">
            Syringe
            <div className="syringe-picker">
              {SYRINGES.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  className={`syringe-chip ${draft.syringeUnits === s.value ? 'is-on' : ''}`}
                  onClick={() => set('syringeUnits', s.value)}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </label>
        </div>
        <p className="detail-math muted">
          {draft.doseAmount}
          {draft.doseUnit}
          {conc > 0 ? ` · ${Math.round(conc)} mcg/mL` : ''} · {drawUpSummary(draft)} (
          {formatUnits(units)}u)
        </p>
      </div>

      <div className="detail-section">
        <p className="detail-section-title">Schedule</p>
        <div className="field-grid">
          <label>
            Frequency
            <select
              value={draft.frequency}
              onChange={(e) => set('frequency', e.target.value as Frequency)}
            >
              {FREQ.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Time
            <input
              type="time"
              value={draft.timeOfDay}
              onChange={(e) => set('timeOfDay', e.target.value)}
            />
          </label>
          <label className="span-2">
            Injection sites
            <input
              value={sitesText}
              placeholder="Abdomen, Thigh"
              onChange={(e) => setSitesText(e.target.value)}
            />
          </label>
          <label>
            Color
            <input
              type="color"
              value={draft.color}
              onChange={(e) => set('color', e.target.value)}
            />
          </label>
          <label>
            Remaining doses
            <input
              type="number"
              min={0}
              value={draft.remainingDoses ?? ''}
              placeholder="Auto"
              onChange={(e) =>
                set(
                  'remainingDoses',
                  e.target.value === '' ? undefined : Number(e.target.value),
                )
              }
            />
          </label>
          <label className="span-2">
            Notes
            <textarea
              rows={2}
              value={draft.notes}
              onChange={(e) => set('notes', e.target.value)}
            />
          </label>
        </div>
      </div>

      <button type="button" className="btn-primary btn-wide" onClick={save}>
        Save
      </button>
      {!isNew && (
        <button
          type="button"
          className={`btn-secondary btn-wide${loggedFlash ? ' is-success' : ''}`}
          onClick={handleLog}
        >
          {loggedFlash ? 'Logged' : 'Log injection'}
        </button>
      )}
    </aside>
  )
}
