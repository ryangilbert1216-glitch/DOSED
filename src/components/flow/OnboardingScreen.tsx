import { ONBOARDING_STEPS } from './screens'

type Props = {
  step: number
  name: string
  reminders: boolean
  onStep: (step: number) => void
  onName: (name: string) => void
  onReminders: (enabled: boolean) => void
  onFinish: () => void
  onSkip: () => void
}

export function OnboardingScreen({
  step,
  name,
  reminders,
  onStep,
  onName,
  onReminders,
  onFinish,
  onSkip,
}: Props) {
  const current = ONBOARDING_STEPS[step] ?? ONBOARDING_STEPS[0]
  const last = step >= ONBOARDING_STEPS.length - 1

  const goNext = () => {
    if (last) onFinish()
    else onStep(step + 1)
  }

  return (
    <section className="flow-screen flow-onboard">
      <header className="flow-onboard-top">
        <div className="flow-dots" aria-label="Onboarding progress">
          {ONBOARDING_STEPS.map((item, index) => (
            <button
              key={item.id}
              type="button"
              className={index === step ? 'is-on' : index < step ? 'is-done' : ''}
              aria-label={item.label}
              onClick={() => onStep(index)}
            />
          ))}
        </div>
        <button type="button" className="btn-ghost" onClick={onSkip}>
          Skip
        </button>
      </header>

      {current.id === 'welcome' && (
        <div key="welcome" className="flow-onboard-body flow-step-in">
          <p className="flow-kicker">Welcome</p>
          <h1>Three things, nothing else.</h1>
          <ul className="flow-points">
            <li>
              <strong>Home</strong>
              <span>Today’s doses, streak, and day plan.</span>
            </li>
            <li>
              <strong>Fridge</strong>
              <span>Vials, protocols, syringe tools.</span>
            </li>
            <li>
              <strong>Track</strong>
              <span>A clean log of what you took.</span>
            </li>
          </ul>
        </div>
      )}

      {current.id === 'name' && (
        <div key="name" className="flow-onboard-body flow-step-in">
          <p className="flow-kicker">You</p>
          <h1>What should we call you?</h1>
          <label className="flow-form">
            Display name
            <input
              value={name}
              onChange={(event) => onName(event.target.value)}
              placeholder="Your name"
              autoComplete="name"
            />
          </label>
        </div>
      )}

      {current.id === 'reminders' && (
        <div key="reminders" className="flow-onboard-body flow-step-in">
          <p className="flow-kicker">Reminders</p>
          <h1>A nudge when a dose is due.</h1>
          <p className="flow-lead">Local only. You can change this later in You.</p>
          <button
            type="button"
            className={`flow-toggle ${reminders ? 'is-on' : ''}`}
            aria-pressed={reminders}
            onClick={() => onReminders(!reminders)}
          >
            <span>Dose reminders</span>
            <i />
          </button>
        </div>
      )}

      {current.id === 'ready' && (
        <div key="ready" className="flow-onboard-body flow-step-in">
          <p className="flow-kicker">Ready</p>
          <h1>{name.trim() ? `${name.trim()}, you’re in.` : 'You’re in.'}</h1>
          <p className="flow-lead">Stock the fridge, then log the first dose.</p>
        </div>
      )}

      <div className="flow-actions">
        {step > 0 && (
          <button type="button" className="btn-secondary flow-btn" onClick={() => onStep(step - 1)}>
            Back
          </button>
        )}
        <button type="button" className="btn-primary flow-btn" onClick={goNext}>
          {last ? 'Enter DOSED' : 'Continue'}
        </button>
      </div>
    </section>
  )
}
