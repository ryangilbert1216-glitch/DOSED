import { useRef, useState } from 'react'
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
  onChange: (p: Peptide) => void
  onLog: () => void
  onArchive: () => void
  onClose: () => void
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

export function VialDetail({ peptide, onChange, onLog, onArchive, onClose }: VialDetailProps) {
  const [loggedFlash, setLoggedFlash] = useState(false)
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const units = unitsForDose(
    peptide.vialMg,
    peptide.diluentMl,
    peptide.doseAmount,
    peptide.doseUnit,
  )
  const conc = concentrationMcgPerMl(peptide.vialMg, peptide.diluentMl)

  const set = <K extends keyof Peptide>(key: K, value: Peptide[K]) =>
    onChange({ ...peptide, [key]: value })

  const handleLog = () => {
    onLog()
    setLoggedFlash(true)
    if (flashTimer.current) clearTimeout(flashTimer.current)
    flashTimer.current = setTimeout(() => setLoggedFlash(false), 1400)
  }

  return (
    <aside className="detail-panel" aria-label={`${peptide.name || 'Vial'} details`}>
      <div className="detail-top">
        <button type="button" className="btn-ghost" onClick={onClose}>
          ← Back
        </button>
        <button type="button" className="btn-danger-ghost" onClick={onArchive}>
          Remove vial
        </button>
      </div>

      <div className="detail-vial-hero">
        <Vial
          name={peptide.name}
          doseAmount={peptide.vialMg}
          doseUnit="mg"
          size="lg"
        />
      </div>

      <input
        className="detail-name"
        value={peptide.name}
        placeholder="Peptide name"
        autoFocus={!peptide.name.trim()}
        onChange={(e) => set('name', e.target.value)}
      />

      <SyringeGuide
        units={units}
        syringeUnits={peptide.syringeUnits ?? 100}
        accent={peptide.color || '#fe1700'}
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
              value={peptide.vialMg}
              onChange={(e) => set('vialMg', Number(e.target.value))}
            />
          </label>
          <label>
            BAC water (mL)
            <input
              type="number"
              min={0}
              step="any"
              value={peptide.diluentMl}
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
              value={peptide.doseAmount}
              onChange={(e) => set('doseAmount', Number(e.target.value))}
            />
          </label>
          <label>
            Unit
            <select
              value={peptide.doseUnit}
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
                  className={`syringe-chip ${peptide.syringeUnits === s.value ? 'is-on' : ''}`}
                  onClick={() => set('syringeUnits', s.value)}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </label>
        </div>
        <p className="detail-math muted">
          {peptide.doseAmount}
          {peptide.doseUnit}
          {conc > 0 ? ` · ${Math.round(conc)} mcg/mL` : ''} · {drawUpSummary(peptide)} (
          {formatUnits(units)}u)
        </p>
      </div>

      <div className="detail-section">
        <p className="detail-section-title">Schedule</p>
        <div className="field-grid">
          <label>
            Frequency
            <select
              value={peptide.frequency}
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
              value={peptide.timeOfDay}
              onChange={(e) => set('timeOfDay', e.target.value)}
            />
          </label>
          <label className="span-2">
            Injection sites
            <input
              value={peptide.injectionSites.join(', ')}
              placeholder="Abdomen, Thigh"
              onChange={(e) =>
                set(
                  'injectionSites',
                  e.target.value
                    .split(',')
                    .map((s) => s.trim())
                    .filter(Boolean),
                )
              }
            />
          </label>
          <label>
            Color
            <input
              type="color"
              value={peptide.color}
              onChange={(e) => set('color', e.target.value)}
            />
          </label>
          <label>
            Remaining doses
            <input
              type="number"
              min={0}
              value={peptide.remainingDoses ?? ''}
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
              value={peptide.notes}
              onChange={(e) => set('notes', e.target.value)}
            />
          </label>
        </div>
      </div>

      <button
        type="button"
        className={`btn-primary btn-wide${loggedFlash ? ' is-success' : ''}`}
        onClick={handleLog}
      >
        {loggedFlash ? 'Logged' : 'Log injection'}
      </button>
    </aside>
  )
}
