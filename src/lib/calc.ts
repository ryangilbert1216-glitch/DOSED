import type { DoseUnit, Peptide } from '../types'

/** Concentration in mcg per mL after reconstitution */
export function concentrationMcgPerMl(vialMg: number, diluentMl: number): number {
  if (diluentMl <= 0) return 0
  return (vialMg * 1000) / diluentMl
}

/** Convert a dose to mcg for insulin-syringe math */
export function doseToMcg(amount: number, unit: DoseUnit): number {
  if (unit === 'mg') return amount * 1000
  if (unit === 'iu') return amount // IU treated as labeled units; user enters matching vial math
  return amount
}

/**
 * Units on a U-100 insulin syringe (100 units = 1 mL).
 * For IU peptides, treat amount as IU and concentration as IU/mL if vialMg is used as IU total.
 */
export function unitsForDose(
  vialMg: number,
  diluentMl: number,
  doseAmount: number,
  doseUnit: DoseUnit,
): number {
  if (diluentMl <= 0 || doseAmount <= 0) return 0
  if (doseUnit === 'iu') {
    const iuPerMl = vialMg / diluentMl
    if (iuPerMl <= 0) return 0
    return (doseAmount / iuPerMl) * 100
  }
  const mcgPerMl = concentrationMcgPerMl(vialMg, diluentMl)
  if (mcgPerMl <= 0) return 0
  const mcg = doseToMcg(doseAmount, doseUnit)
  const ml = mcg / mcgPerMl
  return ml * 100
}

export function formatUnits(units: number): string {
  if (!Number.isFinite(units) || units <= 0) return '—'
  return units < 10 ? units.toFixed(1) : Math.round(units).toString()
}

export function drawUpSummary(p: Peptide): string {
  const u = unitsForDose(p.vialMg, p.diluentMl, p.doseAmount, p.doseUnit)
  return `${formatUnits(u)} units`
}

export function estimateRemainingDoses(p: Peptide): number | null {
  if (p.remainingDoses != null) return p.remainingDoses
  if (p.doseUnit === 'iu') {
    if (p.doseAmount <= 0) return null
    return Math.floor(p.vialMg / p.doseAmount)
  }
  const totalMcg = p.vialMg * 1000
  const doseMcg = doseToMcg(p.doseAmount, p.doseUnit)
  if (doseMcg <= 0) return null
  return Math.floor(totalMcg / doseMcg)
}
