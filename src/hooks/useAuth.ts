import { useCallback, useEffect, useState } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { ensureProfile } from '../lib/cloud'
import { isSupabaseConfigured, supabase } from '../lib/supabase'

export type AuthMode = 'loading' | 'signedOut' | 'signedIn' | 'guest' | 'unconfigured'

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [guest, setGuest] = useState(
    () => localStorage.getItem('dosed-guest') === '1',
  )
  const [loading, setLoading] = useState(isSupabaseConfigured)
  const [authError, setAuthError] = useState<string | null>(null)

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      return
    }

    let alive = true
    void supabase.auth.getSession().then(({ data }) => {
      if (!alive) return
      setSession(data.session)
      setUser(data.session?.user ?? null)
      if (data.session?.user) localStorage.removeItem('dosed-guest')
      setLoading(false)
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next)
      setUser(next?.user ?? null)
      if (next?.user) {
        localStorage.removeItem('dosed-guest')
        setGuest(false)
      }
    })

    return () => {
      alive = false
      sub.subscription.unsubscribe()
    }
  }, [])

  const signUp = useCallback(
    async (email: string, password: string, displayName?: string) => {
      setAuthError(null)
      if (!supabase) {
        setAuthError('Cloud login is not configured yet.')
        return { ok: false as const }
      }
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: { display_name: displayName?.trim() || 'Your name' },
        },
      })
      if (error) {
        setAuthError(error.message)
        return { ok: false as const }
      }
      if (data.user) {
        await ensureProfile(data.user.id, {
          displayName: displayName?.trim() || 'Your name',
        })
      }
      // If email confirmation is required, session may be null
      if (!data.session) {
        setAuthError(
          'Confirm email is still on in Supabase. Turn it off under Authentication → Providers → Email, then sign in here with the same email and password.',
        )
        return { ok: false as const, needsConfirm: true as const }
      }
      return { ok: true as const, user: data.user }
    },
    [],
  )

  const signIn = useCallback(async (email: string, password: string) => {
    setAuthError(null)
    if (!supabase) {
      setAuthError('Cloud login is not configured yet.')
      return { ok: false as const }
    }
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })
    if (error) {
      setAuthError(error.message)
      return { ok: false as const }
    }
    return { ok: true as const, user: data.user }
  }, [])

  const signOut = useCallback(async () => {
    setAuthError(null)
    localStorage.removeItem('dosed-guest')
    setGuest(false)
    if (supabase) await supabase.auth.signOut()
  }, [])

  const continueAsGuest = useCallback(() => {
    localStorage.setItem('dosed-guest', '1')
    setGuest(true)
    setAuthError(null)
  }, [])

  const mode: AuthMode = !isSupabaseConfigured
    ? guest
      ? 'guest'
      : 'unconfigured'
    : loading
      ? 'loading'
      : user
        ? 'signedIn'
        : guest
          ? 'guest'
          : 'signedOut'

  return {
    mode,
    session,
    user,
    userId: user?.id ?? null,
    loading,
    authError,
    setAuthError,
    isCloud: Boolean(user && supabase),
    isGuest: mode === 'guest',
    configured: isSupabaseConfigured,
    signUp,
    signIn,
    signOut,
    continueAsGuest,
  }
}
