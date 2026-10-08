import { useMemo, useState } from 'react'
import { Segmented, SevTag, DiffText, SEV } from './ui.jsx'

const KINDS = [
  { value: 'all', label: 'All' },
  { value: 'domain', label: 'Websites' },
  { value: 'social', label: 'Social' },
  { value: 'app', label: 'Apps' }
]
const LEVELS = [
  { value: 'all', label: 'Any risk' },
  { value: 'critical', label: 'Critical' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' }
]

export default function ThreatQueue({ threats, brandLabel, selectedId, onSelect }) {
  const [kind, setKind] = useState('all')
  const [level, setLevel] = useState('all')

  const shown = useMemo(
    () => threats.filter(t => (kind === 'all' || t.kind === kind) && (level === 'all' || t.risk.severity === level)),
    [threats, kind, level]
  )

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-2">
        <Segmented label="Type" value={kind} onChange={setKind} options={KINDS} />
        <Segmented label="Risk" value={level} onChange={setLevel} options={LEVELS} />
      </div>

      {shown.length === 0 ? (
        <p className="rounded-xl border border-dashed border-cyber-border px-4 py-10 text-center text-sm text-slate-500">
          Nothing matches these filters. Try a different type or risk level, or run a scan from the Scan tab.
        </p>
      ) : (
        <ul className="max-h-[68vh] divide-y divide-cyber-border overflow-y-auto rounded-xl border border-cyber-border bg-cyber-card" aria-label="Possible threats">
          {shown.map(t => {
            const active = t.id === selectedId
            return (
              <li key={t.id}>
                <button
                  onClick={() => onSelect(t.id)}
                  aria-current={active ? 'true' : undefined}
                  className={`relative flex w-full items-center gap-3 px-4 py-3 text-left transition-colors ${active ? 'bg-white/[0.06]' : 'hover:bg-white/[0.03]'}`}
                >
                  <span className={`absolute inset-y-0 left-0 w-1 ${SEV[t.risk.severity].bar}`} aria-hidden="true" />
                  <span className="min-w-0 flex-1">
                    <DiffText text={t.identifier} brand={brandLabel} kind={t.kind} className="block truncate text-sm" />
                    <span className="mt-1 flex flex-wrap items-center gap-x-3 text-xs text-slate-500">
                      <span>{t.platformLabel}</span>
                      {t.technique && <span>{t.technique}</span>}
                      {t.source === 'scan' && <span className="text-sky-300">Found by scan</span>}
                    </span>
                  </span>
                  <span className="flex shrink-0 flex-col items-end gap-1">
                    <span className="font-mono text-sm tabular-nums text-slate-200">{t.risk.riskScore}</span>
                    <SevTag severity={t.risk.severity} />
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
