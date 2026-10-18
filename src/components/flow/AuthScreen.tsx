import { useState } from 'react'
import { BrandMark } from '../BrandMark'

type Mode = 'signin' | 'signup'

type Props = {
  mode: Mode
  error?: string | null
  busy?: boolean
  configured?: boolean
  onSubmit: (payload: {
    email: string
    password: string
    name?: string
  }) => void | Promise<void>
  onSwitch: () => void
  onGuest: () => void
}

export function AuthScreen({
  mode,
  error,
  busy = false,
  configured = true,
  onSubmit,
  onSwitch,
  onGuest,
}: Props) {
  const isSignUp = mode === 'signup'
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [pressed, setPressed] = useState(false)

  return (
    <section className="flow-screen flow-auth">
      <div className="flow-auth-head">
        <BrandMark className="flow-logo flow-logo-sm" onDark />
        <h1>{isSignUp ? 'Create your account' : 'Welcome back'}</h1>
        <p>
          {isSignUp
            ? 'Save your fridge, protocols, and dose history to your account.'
            : 'Pick up your fridge, doses, and history on any device.'}
        </p>
      </div>

      {!configured && (
        <p className="flow-auth-banner" role="status">
          Cloud login isn’t connected yet. Add your Supabase keys to `.env`, or continue as
          guest on this device.
        </p>
      )}

      <form
        className="flow-form"
        onSubmit={(event) => {
          event.preventDefault()
          if (busy) return
          setPressed(true)
          window.setTimeout(() => setPressed(false), 180)
          void onSubmit({
            email: email.trim(),
            password,
            name: isSignUp ? name.trim() : undefined,
          })
        }}
      >
        {isSignUp && (
          <label>
            Name
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Your name"
              autoComplete="name"
              disabled={busy}
            />
          </label>
        )}
        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@email.com"
            autoComplete="email"
            required
            disabled={busy}
          />
        </label>
        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Password"
            autoComplete={isSignUp ? 'new-password' : 'current-password'}
            required
            minLength={6}
            disabled={busy}
          />
        </label>
        {error && (
          <p className="flow-auth-error" role="alert">
            {error}
          </p>
        )}
        <button
          type="submit"
          className={`btn-primary flow-btn${pressed ? ' is-press' : ''}`}
          disabled={busy || !email.trim() || password.length < 6}
        >
          {busy ? 'Please wait…' : isSignUp ? 'Create account' : 'Sign in'}
        </button>
      </form>

      <div className="flow-auth-alt">
        <button type="button" className="btn-ghost flow-switch" onClick={onSwitch} disabled={busy}>
          {isSignUp ? 'I already have an account' : 'Create an account'}
        </button>
        <button type="button" className="flow-guest" onClick={onGuest} disabled={busy}>
          Continue without account
        </button>
      </div>
    </section>
  )
}
