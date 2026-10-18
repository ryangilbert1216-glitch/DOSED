import vialArt from '../assets/vial-branded-blank.png'

interface VialProps {
  name?: string
  doseAmount?: number
  doseUnit?: string
  color?: string
  fill?: number
  uid?: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

function formatDose(amount?: number, unit?: string) {
  if (amount == null || Number.isNaN(amount)) return '—'
  const n = Number.isInteger(amount) ? String(amount) : String(amount)
  return `${n}${unit ?? 'mg'}`
}

export function Vial({
  name = 'Peptide',
  doseAmount,
  doseUnit = 'mg',
  size = 'md',
  className = '',
}: VialProps) {
  const label = (name || 'Peptide').trim() || 'Peptide'
  const dose = formatDose(doseAmount, doseUnit)

  return (
    <div className={`bv bv-${size}${className ? ` ${className}` : ''}`} aria-hidden>
      <img className="bv-art" src={vialArt} alt="" draggable={false} />
      <div className="bv-text">
        <span className="bv-name">{label}</span>
        <span className="bv-dose">{dose}</span>
      </div>
    </div>
  )
}
