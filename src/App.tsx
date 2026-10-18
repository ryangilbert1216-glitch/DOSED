import { useCallback, useEffect, useMemo, useState } from 'react'
import { Fridge } from './components/Fridge'
import { VialDetail } from './components/VialDetail'
import { Calculator } from './components/Calculator'
import { Dashboard } from './components/Dashboard'
import { Log } from './components/Log'
import { NotificationCenter } from './components/NotificationCenter'
import { Profile } from './components/Profile'
import {
  useNotificationInsights,
  useNotificationStore,
} from './hooks/useNotificationStore'
import { useAuth } from './hooks/useAuth'
import { useProtocolStore } from './hooks/useProtocolStore'
import { useReminders } from './hooks/useReminders'
import { BrandMark } from './components/BrandMark'
import { AuthScreen } from './components/flow/AuthScreen'
import { DevMenu, type AppTab } from './components/flow/DevMenu'
import { OnboardingScreen } from './components/flow/OnboardingScreen'
import { SplashScreen } from './components/flow/SplashScreen'
import { type FlowScreen } from './components/flow/screens'
import { ensureProfile, getProfileOnboarded } from './lib/cloud'
import './App.css'
import './flow.css'

type Tab = AppTab
type Theme = 'light' | 'dark'

function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('dosed-theme')
    return saved === 'light' || saved === 'dark' ? saved : 'dark'
  })

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem('dosed-theme', theme)
  }, [theme])

  return { theme, setTheme }
}

const NAV: { id: Tab; label: string; short: string }[] = [
  { id: 'home', label: 'Home', short: 'Home' },
  { id: 'fridge', label: 'Fridge', short: 'Fridge' },
  { id: 'track', label: 'Track', short: 'Track' },
  { id: 'calc', label: 'Calculator', short: 'Calc' },
  { id: 'profile', label: 'Profile', short: 'You' },
]

function NavIcon({ id }: { id: Tab }) {
  const common = {
    className: 'tab-icon-svg',
    viewBox: '0 0 24 24',
    fill: 'none',
    'aria-hidden': true as const,
  }
  switch (id) {
    case 'home':
      return (
        <svg {...common}>
          <path
            d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
        </svg>
      )
    case 'fridge':
      return (
        <svg {...common}>
          <rect
            x="6"
            y="3"
            width="12"
            height="18"
            rx="2"
            stroke="currentColor"
            strokeWidth="1.8"
          />
          <path d="M6 11h12M9 7v2M9 14v3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      )
    case 'track':
      return (
        <svg {...common}>
          <path
            d="M5 12.5 9.5 17 19 7.5"
            stroke="currentColor"
            strokeWidth="1.9"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )
    case 'profile':
      return (
        <svg {...common}>
          <circle cx="12" cy="9" r="3.25" stroke="currentColor" strokeWidth="1.8" />
          <path
            d="M5.5 19.5c1.6-3 4-4.5 6.5-4.5s4.9 1.5 6.5 4.5"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      )
    default:
      return null
  }
}

export default function App() {
  const auth = useAuth()
  const { theme, setTheme } = useTheme()
  const cloud = auth.isCloud

  const {
    state,
    ready: storeReady,
    livePeptides,
    archivedPeptides,
    upsertPeptide,
    archivePeptide,
    restorePeptide,
    logDose,
    undoDoseLog,
    removeLog,
    setRemindersEnabled,
    setDisplayName,
    setProfilePhoto,
    createBlankLive,
    createProtocol,
    updateProtocol,
    deleteProtocol,
    clearTrackerData,
    toggleVialInProtocol,
  } = useProtocolStore({ userId: auth.userId, cloud })

  const [tab, setTab] = useState<Tab>('home')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [screen, setScreen] = useState<FlowScreen>('splash')
  const [onboardStep, setOnboardStep] = useState(0)
  const [draftName, setDraftName] = useState('')
  const [draftReminders, setDraftReminders] = useState(true)
  const [mainKey, setMainKey] = useState(0)
  const [notifOpen, setNotifOpen] = useState(false)
  const [authBusy, setAuthBusy] = useState(false)
  const [flowReady, setFlowReady] = useState(false)

  const {
    notifications,
    unreadCount,
    push: pushNotification,
    markRead,
    markAllRead,
    dismiss,
    clearAll: clearNotifications,
  } = useNotificationStore({ userId: auth.userId, cloud })

  // Route based on auth session / guest
  useEffect(() => {
    if (auth.loading) return

    let cancelled = false
    void (async () => {
      if (auth.mode === 'signedIn' && auth.userId) {
        const onboarded = await getProfileOnboarded(auth.userId)
        if (cancelled) return
        if (onboarded) {
          setScreen('app')
        } else {
          const metaName = (
            auth.user?.user_metadata?.display_name as string | undefined
          )?.trim()
          setDraftName(
            metaName ||
              (state.displayName === 'Your name' ? '' : state.displayName),
          )
          setDraftReminders(state.remindersEnabled)
          setOnboardStep(0)
          setScreen('onboarding')
        }
        setFlowReady(true)
        return
      }

      if (auth.mode === 'guest') {
        const localOnboarded = localStorage.getItem('dosed-onboarded') === '1'
        setScreen(localOnboarded ? 'app' : 'splash')
        setFlowReady(true)
        return
      }

      // signedOut / unconfigured — send returning users to sign-in
      const hadAccount = localStorage.getItem('dosed-had-account') === '1'
      setScreen((prev) => {
        if (prev === 'app' || prev === 'onboarding') return 'signin'
        if (hadAccount && (prev === 'splash' || prev === 'signup')) return 'signin'
        return prev === 'splash' ? 'splash' : prev
      })
      setFlowReady(true)
    })()

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.loading, auth.mode, auth.userId])

  const enterApp = useCallback(
    async (nextTab: Tab = 'home') => {
      const trimmed = draftName.trim()
      if (trimmed) setDisplayName(trimmed)
      setRemindersEnabled(draftReminders)
      if (auth.userId) {
        await ensureProfile(auth.userId, {
          displayName: trimmed || state.displayName,
          remindersEnabled: draftReminders,
          theme,
          onboarded: true,
        })
      } else {
        localStorage.setItem('dosed-onboarded', '1')
      }
      setTab(nextTab)
      setScreen('app')
    },
    [
      auth.userId,
      draftName,
      draftReminders,
      setDisplayName,
      setRemindersEnabled,
      state.displayName,
      theme,
    ],
  )

  const leaveSplash = useCallback(() => setScreen('signup'), [])

  const handleAuthSubmit = useCallback(
    async (payload: { email: string; password: string; name?: string }) => {
      setAuthBusy(true)
      try {
        if (screen === 'signup') {
          const result = await auth.signUp(payload.email, payload.password, payload.name)
          if (result.ok) {
            localStorage.setItem('dosed-had-account', '1')
            if (payload.name?.trim()) setDraftName(payload.name.trim())
            setOnboardStep(0)
            setScreen('onboarding')
          } else if (result.needsConfirm) {
            localStorage.setItem('dosed-had-account', '1')
            setScreen('signin')
          }
        } else {
          const result = await auth.signIn(payload.email, payload.password)
          if (result.ok && result.user) {
            localStorage.setItem('dosed-had-account', '1')
            const onboarded = await getProfileOnboarded(result.user.id)
            if (onboarded) setScreen('app')
            else {
              setOnboardStep(0)
              setScreen('onboarding')
            }
          }
        }
      } finally {
        setAuthBusy(false)
      }
    },
    [auth, screen],
  )

  const handleGuest = useCallback(() => {
    auth.continueAsGuest()
    setOnboardStep(0)
    setScreen('onboarding')
  }, [auth])

  const handleSignOut = useCallback(async () => {
    await auth.signOut()
    setScreen('signin')
    setTab('home')
  }, [auth])

  useReminders(livePeptides, state.remindersEnabled, (p) => {
    pushNotification({
      kind: 'dose',
      title: 'Dose due',
      body: `${p.name || 'Untitled'} — ${p.doseAmount}${p.doseUnit} at ${p.timeOfDay}`,
      dedupeKey: `dose:${p.id}:${new Date().toDateString()}:${p.timeOfDay}`,
      meta: { peptideId: p.id },
    })
  })

  useNotificationInsights({
    livePeptides,
    protocols: state.protocols,
    logs: state.logs,
    displayName: state.displayName,
    push: pushNotification,
  })

  const selected = useMemo(
    () => livePeptides.find((p) => p.id === selectedId) ?? null,
    [livePeptides, selectedId],
  )

  const handleAdd = () => {
    const blank = createBlankLive()
    upsertPeptide(blank)
    setSelectedId(blank.id)
    setTab('fridge')
  }

  const handleCreateVial = (name: string) => {
    const blank = { ...createBlankLive(), name: name.trim() }
    upsertPeptide(blank)
    return blank
  }

  const handleQuickTrack = () => {
    if (livePeptides.length === 0) {
      setTab('fridge')
      return
    }
    if (livePeptides.length === 1) {
      const p = livePeptides[0]
      logDose(p, p.injectionSites[0])
      setTab('track')
      return
    }
    setTab('home')
  }

  const handleLog = (id?: string) => {
    const p = id ? livePeptides.find((x) => x.id === id) : selected
    if (!p) return
    logDose(p, p.injectionSites[0])
  }

  const goTab = (next: Tab) => {
    if (next === tab) return
    setMainKey((k) => k + 1)
    setTab(next)
  }

  const handleThemeChange = (next: Theme) => {
    setTheme(next)
    if (auth.userId) void ensureProfile(auth.userId, { theme: next })
  }

  const devMenu = import.meta.env.DEV ? (
    <DevMenu
      screen={screen}
      onboardStep={onboardStep}
      appTab={tab}
      onFlow={(next, step) => {
        if (typeof step === 'number') setOnboardStep(step)
        setScreen(next)
      }}
      onApp={() => void enterApp('home')}
    />
  ) : null

  if (auth.loading || !flowReady || (cloud && !storeReady && screen === 'app')) {
    return (
      <div className="flow-root flow-loading">
        <BrandMark className="flow-splash-logo" onDark />
        <p className="flow-loading-copy">Loading DOSED…</p>
        {devMenu}
      </div>
    )
  }

  const isAuth = screen === 'signin' || screen === 'signup'

  if (screen !== 'app') {
    return (
      <div className={`flow-root${isAuth ? ' has-auth-video' : ''}`}>
        {isAuth && (
          <div className="flow-auth-bg" aria-hidden>
            <div className="flow-auth-fallback" />
            <video
              className="flow-auth-video"
              src="/auth-bg.mp4"
              autoPlay
              muted
              loop
              playsInline
              preload="auto"
            />
            <div className="flow-auth-overlay" />
          </div>
        )}
        {screen === 'splash' && <SplashScreen onDone={leaveSplash} />}
        {screen === 'signin' && (
          <AuthScreen
            mode="signin"
            error={auth.authError}
            busy={authBusy}
            configured={auth.configured}
            onSubmit={handleAuthSubmit}
            onSwitch={() => {
              auth.setAuthError(null)
              setScreen('signup')
            }}
            onGuest={handleGuest}
          />
        )}
        {screen === 'signup' && (
          <AuthScreen
            mode="signup"
            error={auth.authError}
            busy={authBusy}
            configured={auth.configured}
            onSubmit={handleAuthSubmit}
            onSwitch={() => {
              auth.setAuthError(null)
              setScreen('signin')
            }}
            onGuest={handleGuest}
          />
        )}
        {screen === 'onboarding' && (
          <OnboardingScreen
            step={onboardStep}
            name={draftName}
            reminders={draftReminders}
            onStep={setOnboardStep}
            onName={setDraftName}
            onReminders={setDraftReminders}
            onFinish={() => void enterApp('home')}
            onSkip={() => void enterApp('home')}
          />
        )}
        {devMenu}
      </div>
    )
  }

  return (
    <div className="app-shell">
      <aside className="sidebar" aria-label="Main">
        <div className="brand">
          <BrandMark className="brand-mark" />
        </div>

        <nav className="side-nav">
          {NAV.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`side-nav-btn ${tab === item.id ? 'is-active' : ''}`}
              onClick={() => goTab(item.id)}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div className="side-actions">
          <button type="button" className="btn-primary side-action" onClick={handleAdd}>
            Quick add
          </button>
          <button type="button" className="btn-secondary side-action" onClick={handleQuickTrack}>
            Quick track
          </button>
        </div>
      </aside>

      <div className={`app-stage ${tab === 'home' ? 'stage-home' : ''}`}>
        <header className="mobile-top">
          <div className="brand brand-compact">
            <BrandMark className="brand-mark" />
            {tab === 'fridge' && <span className="top-page-title">Fridge</span>}
            {tab === 'track' && <span className="top-page-title">Track</span>}
            {tab === 'calc' && <span className="top-page-title">Calculator</span>}
            {tab === 'profile' && <span className="top-page-title">You</span>}
          </div>
          <button
            type="button"
            className="top-profile"
            onClick={() => goTab('profile')}
            aria-label="Open profile"
          >
            <span className="top-profile-name">
              {state.displayName?.trim() || 'Your name'}
            </span>
            <span className="top-profile-avatar" aria-hidden>
              {state.profilePhoto ? (
                <img src={state.profilePhoto} alt="" />
              ) : (
                <span>
                  {(state.displayName?.trim() || 'Y').charAt(0).toUpperCase()}
                </span>
              )}
            </span>
          </button>
        </header>

        <main key={mainKey} className={`main main-enter ${tab === 'fridge' ? 'main-fridge' : ''}`}>
          {tab === 'home' && (
            <Dashboard
              peptides={livePeptides}
              logs={state.logs}
              remindersEnabled={state.remindersEnabled}
              unreadNotifications={unreadCount}
              displayName={state.displayName}
              profilePhoto={state.profilePhoto}
              onProfilePhotoChange={setProfilePhoto}
              onAdd={handleAdd}
              onOpenFridge={() => goTab('fridge')}
              onOpenPeptide={(id) => {
                setSelectedId(id)
                goTab('fridge')
              }}
              onOpenProfile={() => goTab('profile')}
              onOpenNotifications={() => setNotifOpen(true)}
              onLog={(p) => logDose(p, p.injectionSites[0])}
              onUndoLog={(p) => undoDoseLog(p.id)}
            />
          )}

          {tab === 'fridge' && (
            <div className={`fridge-layout ${selected ? 'has-detail' : ''}`}>
              <Fridge
                peptides={state.peptides}
                livePeptides={livePeptides}
                archivedPeptides={archivedPeptides}
                protocols={state.protocols}
                selectedId={selectedId}
                onSelect={(id) => setSelectedId(id)}
                onAdd={handleAdd}
                onCreateProtocol={(name) => createProtocol(name ?? 'New protocol')}
                onUpdateProtocol={updateProtocol}
                onDeleteProtocol={deleteProtocol}
                onToggleVialInProtocol={toggleVialInProtocol}
                onUpdatePeptide={upsertPeptide}
                onCreateVial={handleCreateVial}
                onRestore={restorePeptide}
              />
              {selected && (
                <VialDetail
                  peptide={selected}
                  onChange={upsertPeptide}
                  onLog={() => handleLog()}
                  onArchive={() => {
                    archivePeptide(selected.id)
                    setSelectedId(null)
                  }}
                  onClose={() => setSelectedId(null)}
                />
              )}
            </div>
          )}

          {tab === 'track' && (
            <div className="stack-page">
              <Log
                logs={state.logs}
                onUndo={removeLog}
                onOpenFridge={() => goTab('fridge')}
              />
            </div>
          )}

          {tab === 'calc' && (
            <div className="stack-page">
              <Calculator />
            </div>
          )}

          {tab === 'profile' && (
            <div className="stack-page">
              <Profile
                remindersEnabled={state.remindersEnabled}
                onRemindersChange={setRemindersEnabled}
                liveCount={livePeptides.length}
                logCount={state.logs.length}
                onOpenCalc={() => goTab('calc')}
                theme={theme}
                onThemeChange={handleThemeChange}
                displayName={state.displayName}
                onDisplayNameChange={setDisplayName}
                profilePhoto={state.profilePhoto}
                onProfilePhotoChange={setProfilePhoto}
                accountMode={cloud ? 'cloud' : 'guest'}
                onSignOut={() => void handleSignOut()}
                onClearTracker={async () => {
                  setSelectedId(null)
                  await clearTrackerData()
                  clearNotifications()
                }}
              />
            </div>
          )}
        </main>

        <p className="disclaimer">
          Personal tracker only — not medical advice. Verify all math with your protocol source.
        </p>
      </div>

      <nav className="bottom-nav" aria-label="Primary">
        {(
          [
            { id: 'home' as const, label: 'Home' },
            { id: 'fridge' as const, label: 'Fridge' },
            { id: 'track' as const, label: 'Track' },
            { id: 'profile' as const, label: 'You' },
          ] as const
        ).map((item) => (
          <button
            key={item.id}
            type="button"
            className={`tab-btn ${tab === item.id ? 'is-active' : ''}`}
            onClick={() => goTab(item.id)}
          >
            <span className="tab-indicator" aria-hidden />
            <span className="tab-icon" aria-hidden>
              <NavIcon id={item.id} />
            </span>
            <span className="tab-label">{item.label}</span>
          </button>
        ))}
      </nav>
      <NotificationCenter
        open={notifOpen}
        notifications={notifications}
        onClose={() => setNotifOpen(false)}
        onMarkRead={markRead}
        onMarkAllRead={markAllRead}
        onDismiss={dismiss}
        onOpenDose={(peptideId) => {
          setNotifOpen(false)
          if (peptideId) setSelectedId(peptideId)
          goTab('fridge')
        }}
      />
      {devMenu}
    </div>
  )
}
