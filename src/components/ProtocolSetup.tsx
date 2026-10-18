import { useEffect, useMemo, useState } from 'react'
import type { Peptide, Protocol } from '../types'
import { drawUpSummary } from '../lib/calc'

type Mode = 'hub' | 'manage' | 'wizard' | 'done'
type Step = 0 | 1 | 2 | 3

const STEPS = [
  { id: 0 as const, label: 'Name', title: 'What should we call this?', sub: 'Give your protocol a clear name.' },
  { id: 1 as const, label: 'Vials', title: 'Which vials belong here?', sub: 'Tap to add or remove from the stack.' },
  { id: 2 as const, label: 'Schedule', title: 'When do you dose?', sub: 'Set a time for each vial in this protocol.' },
  { id: 3 as const, label: 'Review', title: 'Looking good.', sub: 'Confirm and save your protocol.' },
]

interface ProtocolSetupProps {
  peptides: Peptide[]
  protocols: Protocol[]
  onCreateProtocol: (name?: string) => Protocol | void
  onUpdateProtocol: (p: Protocol) => void
  onDeleteProtocol: (id: string) => void
  onToggleVialInProtocol: (protocolId: string, peptideId: string) => void
  onUpdatePeptide: (p: Peptide) => void
  onCreateVial: (name: string) => Peptide
  onBack: () => void
}

export function ProtocolSetup({
  peptides,
  protocols,
  onCreateProtocol,
  onUpdateProtocol,
  onDeleteProtocol,
  onToggleVialInProtocol,
  onUpdatePeptide,
  onCreateVial,
  onBack,
}: ProtocolSetupProps) {
  const [mode, setMode] = useState<Mode>('hub')
  const [step, setStep] = useState<Step>(0)
  const [stepKey, setStepKey] = useState(0)
  const [manageId, setManageId] = useState<string | null>(null)
  const [draftName, setDraftName] = useState('')
  const [draftIds, setDraftIds] = useState<string[]>([])
  const [draftTimes, setDraftTimes] = useState<Record<string, string>>({})
  const [savedName, setSavedName] = useState('')
  const [addingVial, setAddingVial] = useState(false)
  const [newVialName, setNewVialName] = useState('')

  const manageProto = useMemo(
    () => protocols.find((p) => p.id === manageId) ?? null,
    [protocols, manageId],
  )

  const draftVials = useMemo(
    () =>
      draftIds
        .map((id) => peptides.find((p) => p.id === id))
        .filter((p): p is Peptide => Boolean(p)),
    [draftIds, peptides],
  )

  const goStep = (next: Step) => {
    setStep(next)
    setStepKey((k) => k + 1)
  }

  const startWizard = () => {
    setDraftName('')
    setDraftIds([])
    setDraftTimes({})
    setAddingVial(false)
    setNewVialName('')
    setStep(0)
    setStepKey((k) => k + 1)
    setMode('wizard')
  }

  const submitNewVial = (selectIntoDraft: boolean): Peptide | null => {
    const name = newVialName.trim()
    if (!name) return null
    const created = onCreateVial(name)
    setNewVialName('')
    setAddingVial(false)
    if (selectIntoDraft) {
      setDraftIds((ids) => (ids.includes(created.id) ? ids : [...ids, created.id]))
      setDraftTimes((t) => ({
        ...t,
        [created.id]: created.timeOfDay || '08:00',
      }))
    }
    return created
  }

  const openManage = (id?: string) => {
    setManageId(id ?? protocols[0]?.id ?? null)
    setAddingVial(false)
    setNewVialName('')
    setMode('manage')
  }

  const toggleDraftVial = (id: string) => {
    setDraftIds((ids) => {
      if (ids.includes(id)) {
        setDraftTimes((t) => {
          const next = { ...t }
          delete next[id]
          return next
        })
        return ids.filter((x) => x !== id)
      }
      const peptide = peptides.find((p) => p.id === id)
      setDraftTimes((t) => ({
        ...t,
        [id]: peptide?.timeOfDay || '08:00',
      }))
      return [...ids, id]
    })
  }

  const finishWizard = () => {
    const name = draftName.trim() || 'New protocol'
    const created = onCreateProtocol(name)
    if (created && typeof created === 'object' && 'id' in created) {
      const proto = created as Protocol
      onUpdateProtocol({ ...proto, name, peptideIds: [...draftIds] })
      for (const id of draftIds) {
        const p = peptides.find((x) => x.id === id)
        const time = draftTimes[id]
        if (p && time && p.timeOfDay !== time) {
          onUpdatePeptide({ ...p, timeOfDay: time })
        }
      }
    }
    setSavedName(name)
    setMode('done')
  }

  const canNext =
    step === 0
      ? draftName.trim().length > 0
      : step === 1
        ? draftIds.length > 0
        : step === 2
          ? draftIds.every((id) => Boolean(draftTimes[id]))
          : true

  useEffect(() => {
    if (mode === 'manage' && protocols.length === 0) setMode('hub')
    if (mode === 'manage' && manageId && !protocols.some((p) => p.id === manageId)) {
      setManageId(protocols[0]?.id ?? null)
    }
  }, [mode, protocols, manageId])

  /* —— Hub —— */
  if (mode === 'hub') {
    return (
      <section className="ps" aria-label="Protocols">
        <header className="ps-top ps-anim" style={{ animationDelay: '40ms' }}>
          <button type="button" className="ps-back" onClick={onBack}>
            ← Fridge
          </button>
          <div className="ps-top-copy">
            <p className="eyebrow">Protocols</p>
            <h1>Your stacks</h1>
          </div>
          <span className="ps-top-spacer" aria-hidden />
        </header>

        <p className="ps-lead ps-anim" style={{ animationDelay: '90ms' }}>
          Build a named protocol with vials and dose times — or manage what you already have.
        </p>

        <div className="ps-actions">
          <button
            type="button"
            className="ps-action ps-action-primary ps-anim"
            style={{ animationDelay: '140ms' }}
            onClick={startWizard}
          >
            <span className="ps-action-kicker">Start fresh</span>
            <strong>Add New Protocol</strong>
            <span className="ps-action-hint">Guided setup · name, vials, schedule</span>
          </button>
          <button
            type="button"
            className="ps-action ps-anim"
            style={{ animationDelay: '200ms' }}
            onClick={() => openManage()}
            disabled={protocols.length === 0}
          >
            <span className="ps-action-kicker">Edit existing</span>
            <strong>Manage Protocols</strong>
            <span className="ps-action-hint">
              {protocols.length === 0
                ? 'No protocols yet'
                : `${protocols.length} protocol${protocols.length === 1 ? '' : 's'}`}
            </span>
          </button>
        </div>

        {protocols.length > 0 && (
          <div className="ps-hub-list ps-anim" style={{ animationDelay: '260ms' }}>
            <div className="ps-block-head">
              <h2>Recent</h2>
            </div>
            {protocols.slice(0, 4).map((p, i) => (
              <button
                key={p.id}
                type="button"
                className="ps-hub-row"
                style={{ animationDelay: `${300 + i * 50}ms` }}
                onClick={() => openManage(p.id)}
              >
                <div>
                  <strong>{p.name || 'Untitled'}</strong>
                  <span>
                    {p.peptideIds.length} vial{p.peptideIds.length === 1 ? '' : 's'}
                  </span>
                </div>
                <em>Manage</em>
              </button>
            ))}
          </div>
        )}
      </section>
    )
  }

  /* —— Done —— */
  if (mode === 'done') {
    return (
      <section className="ps ps-done" aria-label="Protocol saved">
        <div className="ps-done-mark ps-anim" aria-hidden>
          <svg viewBox="0 0 48 48" fill="none">
            <circle className="ps-done-ring" cx="24" cy="24" r="20" />
            <path
              className="ps-done-check"
              d="M15 24.5l6 6 12-13"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <h1 className="ps-anim" style={{ animationDelay: '180ms' }}>
          Protocol ready
        </h1>
        <p className="ps-anim" style={{ animationDelay: '240ms' }}>
          <strong>{savedName}</strong> is set with {draftIds.length} vial
          {draftIds.length === 1 ? '' : 's'} and dose times.
        </p>
        <div className="ps-done-actions ps-anim" style={{ animationDelay: '320ms' }}>
          <button type="button" className="fd-cta" onClick={onBack}>
            Back to Fridge
          </button>
          <button type="button" className="ps-ghost" onClick={() => setMode('hub')}>
            Protocols home
          </button>
        </div>
      </section>
    )
  }

  /* —— Wizard —— */
  if (mode === 'wizard') {
    const meta = STEPS[step]
    return (
      <section className="ps ps-wizard" aria-label="New protocol setup">
        <header className="ps-wiz-top">
          <button
            type="button"
            className="ps-back"
            onClick={() => {
              if (step === 0) setMode('hub')
              else goStep((step - 1) as Step)
            }}
          >
            ← Back
          </button>
          <div className="ps-progress" aria-label={`Step ${step + 1} of ${STEPS.length}`}>
            {STEPS.map((s) => (
              <span
                key={s.id}
                className={`ps-progress-seg${s.id <= step ? ' is-on' : ''}${s.id === step ? ' is-current' : ''}`}
              />
            ))}
          </div>
          <span className="ps-step-count">
            {step + 1}/{STEPS.length}
          </span>
        </header>

        <div key={stepKey} className="ps-step">
          <p className="eyebrow ps-anim">{meta.label}</p>
          <h1 className="ps-anim" style={{ animationDelay: '60ms' }}>
            {meta.title}
          </h1>
          <p className="ps-sub ps-anim" style={{ animationDelay: '110ms' }}>
            {meta.sub}
          </p>

          {step === 0 && (
            <label className="ps-name-field ps-anim" style={{ animationDelay: '160ms' }}>
              <span>Protocol name</span>
              <input
                autoFocus
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                placeholder="Morning stack"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && canNext) goStep(1)
                }}
              />
            </label>
          )}

          {step === 1 && (
            <div className="ps-vial-pick ps-anim" style={{ animationDelay: '160ms' }}>
              <div className="ps-vial-toolbar">
                {!addingVial ? (
                  <button
                    type="button"
                    className="ps-add-vial"
                    onClick={() => setAddingVial(true)}
                  >
                    + Add vial
                  </button>
                ) : (
                  <form
                    className="ps-add-vial-form"
                    onSubmit={(e) => {
                      e.preventDefault()
                      submitNewVial(true)
                    }}
                  >
                    <input
                      autoFocus
                      value={newVialName}
                      onChange={(e) => setNewVialName(e.target.value)}
                      placeholder="Vial name"
                      aria-label="New vial name"
                    />
                    <button
                      type="submit"
                      className="ps-add-vial-save"
                      disabled={!newVialName.trim()}
                    >
                      Add
                    </button>
                    <button
                      type="button"
                      className="ps-add-vial-cancel"
                      onClick={() => {
                        setAddingVial(false)
                        setNewVialName('')
                      }}
                    >
                      Cancel
                    </button>
                  </form>
                )}
              </div>

              {peptides.length === 0 && !addingVial ? (
                <p className="ps-hint">No vials yet — add one to continue.</p>
              ) : (
                <div className="ps-pick-grid">
                  {peptides.map((p, i) => {
                    const on = draftIds.includes(p.id)
                    return (
                      <button
                        key={p.id}
                        type="button"
                        className={`ps-pick ps-anim${on ? ' is-on' : ''}`}
                        style={{ animationDelay: `${160 + i * 40}ms` }}
                        onClick={() => toggleDraftVial(p.id)}
                      >
                        <i style={{ background: p.color }} aria-hidden />
                        <span>{p.name || 'Untitled'}</span>
                        <em>{on ? 'Added' : 'Add'}</em>
                      </button>
                    )
                  })}
                </div>
              )}
              <p className="ps-selected-count">
                {draftIds.length} selected
              </p>
            </div>
          )}

          {step === 2 && (
            <ul className="ps-schedule ps-anim" style={{ animationDelay: '160ms' }}>
              {draftVials.map((p, i) => (
                <li
                  key={p.id}
                  className="ps-schedule-row ps-anim"
                  style={{ animationDelay: `${160 + i * 50}ms` }}
                >
                  <div className="ps-stack-main">
                    <i style={{ background: p.color }} aria-hidden />
                    <div>
                      <strong>{p.name || 'Untitled'}</strong>
                      <span>
                        {p.doseAmount}
                        {p.doseUnit} · {drawUpSummary(p)}
                      </span>
                    </div>
                  </div>
                  <label className="ps-time">
                    <span>Dose time</span>
                    <input
                      type="time"
                      value={draftTimes[p.id] || p.timeOfDay}
                      onChange={(e) =>
                        setDraftTimes((t) => ({ ...t, [p.id]: e.target.value }))
                      }
                    />
                  </label>
                </li>
              ))}
            </ul>
          )}

          {step === 3 && (
            <div className="ps-review ps-anim" style={{ animationDelay: '160ms' }}>
              <div className="ps-review-card">
                <p className="eyebrow">Protocol</p>
                <h2>{draftName.trim() || 'Untitled'}</h2>
                <ul>
                  {draftVials.map((p) => (
                    <li key={p.id}>
                      <i style={{ background: p.color }} aria-hidden />
                      <span>{p.name || 'Untitled'}</span>
                      <em>{draftTimes[p.id] || p.timeOfDay}</em>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>

        <footer className="ps-wiz-footer">
          {step < 3 ? (
            <button
              type="button"
              className="ps-next"
              disabled={!canNext}
              onClick={() => goStep((step + 1) as Step)}
            >
              Continue
            </button>
          ) : (
            <button type="button" className="ps-next" onClick={finishWizard}>
              Save protocol
            </button>
          )}
        </footer>
      </section>
    )
  }

  /* —— Manage —— */
  const stack = manageProto
    ? manageProto.peptideIds
        .map((id) => peptides.find((p) => p.id === id))
        .filter((p): p is Peptide => Boolean(p))
    : []

  return (
    <section className="ps" aria-label="Manage protocols">
      <header className="ps-top">
        <button type="button" className="ps-back" onClick={() => setMode('hub')}>
          ← Protocols
        </button>
        <div className="ps-top-copy">
          <p className="eyebrow">Manage</p>
          <h1>Edit stack</h1>
        </div>
        <button type="button" className="ps-new" onClick={startWizard}>
          New
        </button>
      </header>

      <div className="ps-list" role="list">
        {protocols.map((p) => (
          <button
            key={p.id}
            type="button"
            role="listitem"
            className={`ps-list-item${p.id === manageId ? ' is-on' : ''}`}
            onClick={() => setManageId(p.id)}
          >
            <strong>{p.name || 'Untitled'}</strong>
            <span>
              {p.peptideIds.length} vial{p.peptideIds.length === 1 ? '' : 's'}
            </span>
          </button>
        ))}
      </div>

      {manageProto && (
        <div className="ps-editor ps-anim">
          <label className="ps-field">
            <span>Protocol name</span>
            <input
              value={manageProto.name}
              onChange={(e) => onUpdateProtocol({ ...manageProto, name: e.target.value })}
              placeholder="e.g. Morning stack"
            />
          </label>

          <div className="ps-block">
            <div className="ps-block-head">
              <h2>Vials & dose times</h2>
              <span>{stack.length}</span>
            </div>
            {stack.length === 0 ? (
              <p className="ps-hint">Add vials from inventory below.</p>
            ) : (
              <ul className="ps-stack">
                {stack.map((p) => (
                  <li key={p.id} className="ps-stack-row">
                    <div className="ps-stack-main">
                      <i style={{ background: p.color }} aria-hidden />
                      <div>
                        <strong>{p.name || 'Untitled'}</strong>
                        <span>
                          {p.doseAmount}
                          {p.doseUnit} · {drawUpSummary(p)}
                        </span>
                      </div>
                    </div>
                    <label className="ps-time">
                      <span>Dose time</span>
                      <input
                        type="time"
                        value={p.timeOfDay}
                        onChange={(e) =>
                          onUpdatePeptide({ ...p, timeOfDay: e.target.value })
                        }
                      />
                    </label>
                    <button
                      type="button"
                      className="ps-remove"
                      onClick={() => onToggleVialInProtocol(manageProto.id, p.id)}
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="ps-block">
            <div className="ps-block-head">
              <h2>Inventory</h2>
              {!addingVial ? (
                <button
                  type="button"
                  className="fd-link"
                  onClick={() => setAddingVial(true)}
                >
                  New vial
                </button>
              ) : null}
            </div>
            {addingVial && (
              <form
                className="ps-add-vial-form ps-add-vial-form-manage"
                onSubmit={(e) => {
                  e.preventDefault()
                  const created = submitNewVial(false)
                  if (created) onToggleVialInProtocol(manageProto.id, created.id)
                }}
              >
                <input
                  autoFocus
                  value={newVialName}
                  onChange={(e) => setNewVialName(e.target.value)}
                  placeholder="Vial name"
                  aria-label="New vial name"
                />
                <button
                  type="submit"
                  className="ps-add-vial-save"
                  disabled={!newVialName.trim()}
                >
                  Add
                </button>
                <button
                  type="button"
                  className="ps-add-vial-cancel"
                  onClick={() => {
                    setAddingVial(false)
                    setNewVialName('')
                  }}
                >
                  Cancel
                </button>
              </form>
            )}
            <div className="ps-pick-grid">
              {peptides.map((p) => {
                const on = manageProto.peptideIds.includes(p.id)
                return (
                  <button
                    key={p.id}
                    type="button"
                    className={`ps-pick${on ? ' is-on' : ''}`}
                    onClick={() => onToggleVialInProtocol(manageProto.id, p.id)}
                  >
                    <i style={{ background: p.color }} aria-hidden />
                    <span>{p.name || 'Untitled'}</span>
                    <em>{on ? 'In stack' : 'Add'}</em>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="ps-footer">
            <button
              type="button"
              className="ps-delete"
              onClick={() => onDeleteProtocol(manageProto.id)}
            >
              Delete protocol
            </button>
            <button type="button" className="fd-cta" onClick={() => setMode('hub')}>
              Done
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
