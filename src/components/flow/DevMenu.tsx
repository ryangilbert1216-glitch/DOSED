import { useEffect, useState } from 'react'
import { ONBOARDING_STEPS, type FlowScreen, type OnboardingStep } from './screens'

type AppTab = 'home' | 'fridge' | 'track' | 'calc' | 'profile'

const APP_PAGES: { id: AppTab; label: string }[] = [
  { id: 'home', label: 'Home' },
  { id: 'fridge', label: 'Fridge' },
  { id: 'track', label: 'Track' },
  { id: 'calc', label: 'Calculator' },
  { id: 'profile', label: 'You' },
]

type Props = {
  screen: FlowScreen
  onboardStep: number
  appTab: AppTab
  onFlow: (screen: FlowScreen, step?: number) => void
  onApp: (tab: AppTab) => void
}

export function DevMenu({ screen, onboardStep, appTab, onFlow, onApp }: Props) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <div className="dev-menu">
      {open && (
        <div className="dev-menu-panel" role="menu" aria-label="Dev flow">
          <p className="dev-menu-kicker">Flow</p>
          <button
            type="button"
            className={screen === 'splash' ? 'is-current' : ''}
            onClick={() => {
              onFlow('splash')
              setOpen(false)
            }}
          >
            Splash
          </button>
          <button
            type="button"
            className={screen === 'signup' ? 'is-current' : ''}
            onClick={() => {
              onFlow('signup')
              setOpen(false)
            }}
          >
            Sign up
          </button>
          <button
            type="button"
            className={screen === 'signin' ? 'is-current' : ''}
            onClick={() => {
              onFlow('signin')
              setOpen(false)
            }}
          >
            Sign in
          </button>
          {ONBOARDING_STEPS.map((step, index) => (
            <button
              key={step.id}
              type="button"
              className={
                screen === 'onboarding' && onboardStep === index ? 'is-current' : ''
              }
              onClick={() => {
                onFlow('onboarding', index)
                setOpen(false)
              }}
            >
              Onboarding · {step.label}
            </button>
          ))}

          <p className="dev-menu-kicker">App</p>
          {APP_PAGES.map((page) => (
            <button
              key={page.id}
              type="button"
              className={screen === 'app' && appTab === page.id ? 'is-current' : ''}
              onClick={() => {
                onApp(page.id)
                setOpen(false)
              }}
            >
              {page.label}
            </button>
          ))}
        </div>
      )}
      <button
        type="button"
        className="dev-menu-toggle"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        Dev
      </button>
    </div>
  )
}

export type { AppTab, OnboardingStep }
