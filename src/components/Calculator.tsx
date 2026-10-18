import { useMemo, useState } from 'react'
import { concentrationMcgPerMl, formatUnits, unitsForDose } from '../lib/calc'
import type { DoseUnit } from '../types'

type Props = { compact?: boolean }

export function Calculator({ compact = false }: Props) {
  const [vialMg, setVialMg] = useState(5)
  const [diluentMl, setDiluentMl] = useState(2)
  const [doseAmount, setDoseAmount] = useState(250)
  const [doseUnit, setDoseUnit] = useState<DoseUnit>('mcg')

  const result = useMemo(() => {
    const units = unitsForDose(vialMg, diluentMl, doseAmount, doseUnit)
    const conc = concentrationMcgPerMl(vialMg, diluentMl)
    return { units, conc }
  }, [vialMg, diluentMl, doseAmount, doseUnit])

  return (
    <section className={`panel calc-panel${compact ? ' is-compact' : ''}`}>
      <p className="eyebrow">Reconstitution</p>
      <h2>Dose calculator</h2>
      {!compact && (
        <p className="muted">Vial strength + bacteriostatic water → insulin syringe units.</p>
      )}

      <div className="field-grid">
        <label>
          Vial contents (mg)
          <input
            type="number"
            min={0}
            step="any"
            value={vialMg}
            onChange={(e) => setVialMg(Number(e.target.value))}
          />
        </label>
        <label>
          Diluent (mL)
          <input
            type="number"
            min={0}
            step="any"
            value={diluentMl}
            onChange={(e) => setDiluentMl(Number(e.target.value))}
          />
        </label>
        <label>
          Target dose
          <input
            type="number"
            min={0}
            step="any"
            value={doseAmount}
            onChange={(e) => setDoseAmount(Number(e.target.value))}
          />
        </label>
        <label>
          Unit
          <select value={doseUnit} onChange={(e) => setDoseUnit(e.target.value as DoseUnit)}>
            <option value="mcg">mcg</option>
            <option value="mg">mg</option>
            <option value="iu">IU</option>
          </select>
        </label>
      </div>

      <div className="calc-result">
        <div>
          <p className="eyebrow">Draw</p>
          <p className="calc-big">{formatUnits(result.units)} units</p>
        </div>
        <div>
          <p className="eyebrow">Concentration</p>
          <p className="calc-mid">
            {result.conc > 0 ? `${Math.round(result.conc)} mcg/mL` : '—'}
          </p>
        </div>
      </div>
    </section>
  )
}
