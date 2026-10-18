import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { Peptide, Protocol } from '../types'
import { drawUpSummary, estimateRemainingDoses, unitsForDose } from '../lib/calc'
import { Calculator } from './Calculator'
import { ProtocolSetup } from './ProtocolSetup'
import { SyringeGuide } from './SyringeGuide'
import { Vial } from './Vial'

type DashTab = 'home' | 'protocols' | 'tools'
type ListFilter = 'active' | 'all' | 'archived'
type ToolPanel = 'none' | 'syringe' | 'calc'

const DASH_TABS: { id: DashTab; label: string }[] = [
  { id: 'home', label: 'Vials' },
  { id: 'protocols', label: 'Protocols' },
  { id: 'tools', label: 'Tools' },
]

const SEARCH_CYCLE = ['vials', 'names', 'doses', 'inventory'] as const

interface FridgeProps {
  peptides: Peptide[]
  livePeptides: Peptide[]
  archivedPeptides: Peptide[]
  protocols: Protocol[]
  selectedId: string | null
  onSelect: (id: string) => void
  onAdd: () => void
  onCreateProtocol: (name?: string) => Protocol | void
  onUpdateProtocol: (p: Protocol) => void
  onDeleteProtocol: (id: string) => void
  onToggleVialInProtocol: (protocolId: string, peptideId: string) => void
  onUpdatePeptide: (p: Peptide) => void
  onCreateVial: (name: string) => Peptide
  onRestore: (id: string) => void
}

export function Fridge({
  peptides,
  livePeptides,
  archivedPeptides,
  protocols,
  selectedId,
  onSelect,
  onAdd,
  onCreateProtocol,
  onUpdateProtocol,
  onDeleteProtocol,
  onToggleVialInProtocol,
  onUpdatePeptide,
  onCreateVial,
  onRestore,
}: FridgeProps) {
  const [dashTab, setDashTab] = useState<DashTab>('home')
  const [listFilter, setListFilter] = useState<ListFilter>('active')
  const [query, setQuery] = useState('')
  const [searchFocused, setSearchFocused] = useState(false)
  const [cycleIndex, setCycleIndex] = useState(0)
  const [toolPanel, setToolPanel] = useState<ToolPanel>('none')
  const [packSyringe, setPackSyringe] = useState<30 | 50 | 100>(100)
  const pillsRef = useRef<HTMLElement>(null)
  const pillBtnRefs = useRef<Partial<Record<DashTab, HTMLButtonElement | null>>>({})
  const [pillThumb, setPillThumb] = useState({ left: 0, width: 0, ready: false })

  useLayoutEffect(() => {
    const measure = () => {
      const nav = pillsRef.current
      const btn = pillBtnRefs.current[dashTab]
      if (!nav || !btn) return
      const navBox = nav.getBoundingClientRect()
      const btnBox = btn.getBoundingClientRect()
      setPillThumb({
        left: btnBox.left - navBox.left + nav.scrollLeft,
        width: btnBox.width,
        ready: true,
      })
    }
    measure()
    const nav = pillsRef.current
    if (!nav) return
    const ro = new ResizeObserver(measure)
    ro.observe(nav)
    window.addEventListener('resize', measure)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [dashTab])

  const sampleUnits = useMemo(() => {
    const sample = livePeptides[0]
    if (!sample) return 25
    return unitsForDose(sample.vialMg, sample.diluentMl, sample.doseAmount, sample.doseUnit)
  }, [livePeptides])

  const filteredList = useMemo(() => {
    const base =
      listFilter === 'active'
        ? livePeptides
        : listFilter === 'archived'
          ? archivedPeptides
          : peptides
    const q = query.trim().toLowerCase()
    if (!q) return base
    return base.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.doseUnit.toLowerCase().includes(q) ||
        `${p.doseAmount}`.includes(q),
    )
  }, [archivedPeptides, listFilter, livePeptides, peptides, query])

  const showCyclePlaceholder = !query && !searchFocused

  useEffect(() => {
    if (!showCyclePlaceholder) return
    const id = window.setInterval(() => {
      setCycleIndex((i) => (i + 1) % SEARCH_CYCLE.length)
    }, 2200)
    return () => window.clearInterval(id)
  }, [showCyclePlaceholder])

  const openProtocols = () => {
    setDashTab('protocols')
    setToolPanel('none')
  }

  const toggleTool = (panel: ToolPanel) => {
    setToolPanel((cur) => (cur === panel ? 'none' : panel))
    setDashTab('tools')
  }

  if (dashTab === 'protocols') {
    return (
      <section className="fd" aria-label="Fridge dashboard">
        <nav className="fd-pills" aria-label="Fridge sections" ref={pillsRef}>
          <span
            className={`fd-pill-thumb${pillThumb.ready ? ' is-ready' : ''}`}
            aria-hidden
            style={{
              transform: `translateX(${pillThumb.left}px)`,
              width: pillThumb.width,
            }}
          />
          {DASH_TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`fd-pill ${dashTab === t.id ? 'is-on' : ''}`}
              ref={(el) => {
                pillBtnRefs.current[t.id] = el
              }}
              onClick={() => {
                setDashTab(t.id)
                if (t.id === 'tools') setToolPanel('syringe')
                if (t.id === 'home') setToolPanel('none')
              }}
            >
              {t.label}
            </button>
          ))}
        </nav>

        <ProtocolSetup
          peptides={peptides}
          protocols={protocols}
          onCreateProtocol={onCreateProtocol}
          onUpdateProtocol={onUpdateProtocol}
          onDeleteProtocol={onDeleteProtocol}
          onToggleVialInProtocol={onToggleVialInProtocol}
          onUpdatePeptide={onUpdatePeptide}
          onCreateVial={onCreateVial}
          onBack={() => setDashTab('home')}
        />
      </section>
    )
  }

  return (
    <section className="fd" aria-label="Fridge dashboard">
      <nav className="fd-pills" aria-label="Fridge sections" ref={pillsRef}>
        <span
          className={`fd-pill-thumb${pillThumb.ready ? ' is-ready' : ''}`}
          aria-hidden
          style={{
            transform: `translateX(${pillThumb.left}px)`,
            width: pillThumb.width,
          }}
        />
        {DASH_TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`fd-pill ${dashTab === t.id ? 'is-on' : ''}`}
            ref={(el) => {
              pillBtnRefs.current[t.id] = el
            }}
            onClick={() => {
              setDashTab(t.id)
              if (t.id === 'tools') setToolPanel('syringe')
              if (t.id === 'home') setToolPanel('none')
            }}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <label className="fd-search">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
          <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
          <path d="M20 20l-3.5-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <span className="fd-search-field">
          <input
            type="search"
            placeholder=""
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            aria-label="Search vials, protocols, doses, and more"
          />
          {showCyclePlaceholder && (
            <span className="fd-search-ph" aria-hidden>
              <span className="fd-search-ph-static">Search </span>
              <span className="fd-search-cycle">
                <span
                  className="fd-search-cycle-track"
                  style={{ transform: `translateY(-${cycleIndex * 1.25}em)` }}
                >
                  {SEARCH_CYCLE.map((term) => (
                    <span key={term} className="fd-search-cycle-item">
                      “{term}”
                    </span>
                  ))}
                </span>
              </span>
            </span>
          )}
        </span>
      </label>

      <div className="fd-quick" role="list">
        <button type="button" className="fd-quick-item" role="listitem" onClick={onAdd}>
          <span className="fd-quick-icon" aria-hidden>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
            </svg>
          </span>
          <span>Add vial</span>
        </button>
        <button type="button" className="fd-quick-item" role="listitem" onClick={openProtocols}>
          <span className="fd-quick-icon" aria-hidden>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <rect x="4" y="5" width="16" height="14" rx="3" stroke="currentColor" strokeWidth="2" />
              <path d="M8 9h8M8 13h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </span>
          <span>Protocol</span>
        </button>
        <button
          type="button"
          className={`fd-quick-item ${toolPanel === 'syringe' ? 'is-on' : ''}`}
          role="listitem"
          onClick={() => toggleTool('syringe')}
        >
          <span className="fd-quick-icon" aria-hidden>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path
                d="M14.5 3.5l6 6M13 5l6 6M4 20l8.5-8.5M9.5 9.5l5 5"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </span>
          <span>Syringe</span>
        </button>
        <button
          type="button"
          className={`fd-quick-item ${toolPanel === 'calc' ? 'is-on' : ''}`}
          role="listitem"
          onClick={() => toggleTool('calc')}
        >
          <span className="fd-quick-icon" aria-hidden>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <rect x="5" y="3" width="14" height="18" rx="2.5" stroke="currentColor" strokeWidth="2" />
              <path
                d="M8 8h8M8 12h3M13 12h3M8 16h3M13 16h3"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </span>
          <span>Calc</span>
        </button>
      </div>

      {/* Protocol preview → setup */}
      <section className="fd-section" aria-label="Protocols">
        <div className="fd-section-head">
          <h2>Your protocols</h2>
          <button type="button" className="fd-link" onClick={openProtocols}>
            Setup
          </button>
        </div>

        {protocols.length === 0 ? (
          <button type="button" className="fd-hero-empty" onClick={openProtocols}>
            <strong>Setup a protocol</strong>
            <span>Name it, add vials, and set dose times</span>
          </button>
        ) : (
          <div className="fd-proto-summary">
            {protocols.slice(0, 3).map((proto) => (
              <button
                key={proto.id}
                type="button"
                className="fd-proto-summary-card"
                onClick={openProtocols}
              >
                <strong>{proto.name || 'Untitled'}</strong>
                <span>
                  {proto.peptideIds.length} vial{proto.peptideIds.length === 1 ? '' : 's'}
                </span>
              </button>
            ))}
            {protocols.length > 3 && (
              <button type="button" className="fd-proto-summary-more" onClick={openProtocols}>
                +{protocols.length - 3} more
              </button>
            )}
          </div>
        )}
      </section>

      <button type="button" className="fd-banner-cta" onClick={onAdd}>
        Add vial to fridge
      </button>

      {toolPanel !== 'none' && (
        <section className="fd-tool-sheet" aria-label="Tools">
          {toolPanel === 'syringe' && (
            <>
              <div className="fd-section-head">
                <h2>Syringe pack</h2>
                <div className="fd-filter-row fd-filter-tight">
                  {([30, 50, 100] as const).map((s) => (
                    <button
                      key={s}
                      type="button"
                      className={`fd-filter ${packSyringe === s ? 'is-on' : ''}`}
                      onClick={() => setPackSyringe(s)}
                    >
                      {s}u
                    </button>
                  ))}
                </div>
              </div>
              <SyringeGuide units={sampleUnits} syringeUnits={packSyringe} />
            </>
          )}
          {toolPanel === 'calc' && <Calculator compact />}
        </section>
      )}

      <section className="fd-section" aria-label="Vials">
        <div className="fd-cats" role="tablist" aria-label="Vial lists">
          {(
            [
              { id: 'active' as const, label: 'Active', count: livePeptides.length },
              { id: 'all' as const, label: 'Inventory', count: peptides.length },
              { id: 'archived' as const, label: 'Archived', count: archivedPeptides.length },
            ] as const
          ).map((c) => (
            <button
              key={c.id}
              type="button"
              role="tab"
              aria-selected={listFilter === c.id}
              className={`fd-cat ${listFilter === c.id ? 'is-on' : ''}`}
              onClick={() => setListFilter(c.id)}
            >
              {c.label}
              <span>{c.count}</span>
            </button>
          ))}
        </div>

        <div className="fd-filter-row" aria-label="Quick filters">
          <button
            type="button"
            className={`fd-filter ${!query && listFilter === 'active' ? 'is-on' : ''}`}
            onClick={() => {
              setListFilter('active')
              setQuery('')
            }}
          >
            Live now
          </button>
          <button type="button" className="fd-filter" onClick={onAdd}>
            + New vial
          </button>
          <button
            type="button"
            className={`fd-filter ${toolPanel === 'syringe' ? 'is-on' : ''}`}
            onClick={() => toggleTool('syringe')}
          >
            Draw guide
          </button>
        </div>

        {filteredList.length === 0 ? (
          <div className="fd-empty">
            <p>
              {query
                ? 'No vials match that search.'
                : listFilter === 'archived'
                  ? 'No archived vials.'
                  : 'Nothing here yet — add a vial.'}
            </p>
            {!query && listFilter !== 'archived' && (
              <button type="button" className="fd-cta" onClick={onAdd}>
                Add vial
              </button>
            )}
          </div>
        ) : (
          <div className="fd-cards" role="list">
            {filteredList.map((p) => {
              const rem = estimateRemainingDoses(p)
              return (
                <article
                  key={p.id}
                  className={`fd-card ${selectedId === p.id ? 'is-selected' : ''}`}
                  role="listitem"
                >
                  <button type="button" className="fd-card-main" onClick={() => onSelect(p.id)}>
                    <div className="fd-card-vial">
                      <Vial name={p.name} doseAmount={p.vialMg} doseUnit="mg" size="md" />
                    </div>
                    <div className="fd-card-body">
                      <div className="fd-card-title-row">
                        <strong>{p.name || 'Untitled'}</strong>
                        <span className={`fd-status ${p.status}`}>{p.status}</span>
                      </div>
                      <div className="fd-card-lines">
                        <span>
                          {p.doseAmount}
                          {p.doseUnit} · {drawUpSummary(p)}
                        </span>
                        <span>
                          {p.syringeUnits}u syringe · {p.timeOfDay}
                        </span>
                      </div>
                    </div>
                    <span className="fd-card-odds" aria-hidden>
                      {rem != null ? `${Math.max(0, Math.round(rem))}×` : '—'}
                    </span>
                  </button>
                  {p.status === 'archived' && (
                    <button type="button" className="fd-card-restore" onClick={() => onRestore(p.id)}>
                      Restore
                    </button>
                  )}
                </article>
              )
            })}
          </div>
        )}
      </section>
    </section>
  )
}
