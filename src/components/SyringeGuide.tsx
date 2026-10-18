import type { SyringeSize } from '../types'
import { formatUnits } from '../lib/calc'

type Props = {
  units: number
  syringeUnits: SyringeSize
  accent?: string
}

export function SyringeGuide({ units, syringeUnits, accent = '#fe1700' }: Props) {
  const capacity = syringeUnits
  const safeUnits = Number.isFinite(units) && units > 0 ? units : 0
  const capped = Math.min(safeUnits, capacity)
  const fill = capped / capacity
  const overflow = safeUnits > capacity

  const ticks =
    capacity === 30
      ? [0, 5, 10, 15, 20, 25, 30]
      : capacity === 50
        ? [0, 10, 20, 30, 40, 50]
        : [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100]

  const barrelW = 280
  const barrelH = 36
  const padL = 28
  const padR = 18
  const innerW = barrelW - padL - padR

  return (
    <div className="syringe-guide">
      <div className="syringe-guide-head">
        <div>
          <p className="eyebrow">Pull to</p>
          <p className="syringe-guide-value">
            {formatUnits(safeUnits)} <span>units</span>
          </p>
        </div>
        <p className="syringe-guide-cap">U-100 · {capacity}u syringe</p>
      </div>

      <svg
        className="syringe-svg"
        viewBox={`0 0 ${barrelW} 78`}
        role="img"
        aria-label={`Draw ${formatUnits(safeUnits)} units on a ${capacity} unit syringe`}
      >
        {/* needle */}
        <line x1="6" y1="28" x2={padL} y2="28" stroke="currentColor" strokeWidth="2" opacity="0.55" />
        <polygon points="2,28 8,25 8,31" fill="currentColor" opacity="0.55" />

        {/* barrel */}
        <rect
          x={padL}
          y={10}
          width={innerW}
          height={barrelH}
          rx="6"
          fill="var(--surface)"
          stroke="var(--line)"
          strokeWidth="1.5"
        />

        {/* dose fill */}
        <rect
          x={padL}
          y={10}
          width={Math.max(0, innerW * fill)}
          height={barrelH}
          rx="6"
          fill={accent}
          opacity="0.88"
        />

        {/* glass edge */}
        <rect
          x={padL}
          y={10}
          width={innerW}
          height={barrelH}
          rx="6"
          fill="none"
          stroke="var(--ink)"
          strokeOpacity="0.12"
          strokeWidth="1"
        />

        {/* plunger */}
        <rect
          x={padL + innerW - 2}
          y={16}
          width="14"
          height={barrelH - 12}
          rx="3"
          fill="var(--ink)"
          opacity="0.2"
        />
        <rect
          x={padL + innerW + 10}
          y={20}
          width="8"
          height={barrelH - 20}
          rx="2"
          fill="var(--ink)"
          opacity="0.35"
        />

        {/* tick marks + labels */}
        {ticks.map((t) => {
          const x = padL + (t / capacity) * innerW
          const major = t % (capacity === 100 ? 20 : 10) === 0 || t === capacity || t === 0
          return (
            <g key={t}>
              <line
                x1={x}
                y1={10}
                x2={x}
                y2={major ? 22 : 17}
                stroke="var(--ink)"
                strokeOpacity={major ? 0.45 : 0.22}
                strokeWidth="1"
              />
              {major && (
                <text
                  x={x}
                  y={62}
                  textAnchor="middle"
                  fontSize="9"
                  fontWeight="600"
                  fill="var(--ink-soft)"
                >
                  {t}
                </text>
              )}
            </g>
          )
        })}

        {/* dose marker */}
        {safeUnits > 0 && (
          <g>
            <line
              x1={padL + fill * innerW}
              y1={8}
              x2={padL + fill * innerW}
              y2={50}
              stroke={accent}
              strokeWidth="2"
            />
            <circle
              cx={padL + fill * innerW}
              cy={8}
              r="3.5"
              fill={accent}
            />
          </g>
        )}
      </svg>

      {overflow ? (
        <p className="syringe-warn">Dose exceeds this syringe — pick a larger size.</p>
      ) : (
        <p className="syringe-hint">Match the orange mark on your syringe barrel.</p>
      )}
    </div>
  )
}
