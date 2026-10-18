export type FlowScreen =
  | 'splash'
  | 'signin'
  | 'signup'
  | 'onboarding'
  | 'app'

export const ONBOARDING_STEPS = [
  { id: 'welcome', label: 'Welcome' },
  { id: 'name', label: 'Name' },
  { id: 'reminders', label: 'Reminders' },
  { id: 'ready', label: 'Ready' },
] as const

export type OnboardingStep = (typeof ONBOARDING_STEPS)[number]['id']
