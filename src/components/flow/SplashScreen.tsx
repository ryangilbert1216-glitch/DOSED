import { useEffect } from 'react'
import { BrandMark } from '../BrandMark'

type Props = {
  onDone: () => void
}

export function SplashScreen({ onDone }: Props) {
  useEffect(() => {
    const timer = window.setTimeout(onDone, 1600)
    return () => window.clearTimeout(timer)
  }, [onDone])

  return (
    <section
      className="flow-screen flow-splash"
      onClick={onDone}
      role="presentation"
    >
      <BrandMark className="flow-splash-logo" onDark />
    </section>
  )
}
