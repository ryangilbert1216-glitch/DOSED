import logoOnDark from '../assets/dosed-logo.png'
import logoOnLight from '../assets/dosed-logo-dark.png'

type Props = {
  className?: string
  /** White wordmark for dark surfaces. Defaults to theme-aware swap. */
  onDark?: boolean
  alt?: string
}

export function BrandMark({ className = '', onDark, alt = 'DOSED' }: Props) {
  if (typeof onDark === 'boolean') {
    return (
      <img
        className={className}
        src={onDark ? logoOnDark : logoOnLight}
        alt={alt}
        draggable={false}
      />
    )
  }

  return (
    <span className={`brand-mark-swap ${className}`.trim()}>
      <img className="brand-mark-dark-surface" src={logoOnDark} alt="" draggable={false} />
      <img className="brand-mark-light-surface" src={logoOnLight} alt={alt} draggable={false} />
    </span>
  )
}
