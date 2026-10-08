import { useState } from 'react'
import { Pencil } from 'lucide-react'
import { Button, Field, Notice, SEV, SEVERITIES, inputClass } from './ui.jsx'

const toList = text => text.split(/[,\n]/).map(s => s.trim()).filter(Boolean)

export default function BrandHeader({ brand, summary, stats, onSave, onChangeBrand }) {
  const [editing, setEditing] = useState(false)
  const [domains, setDomains] = useState('')
  const [handles, setHandles] = useState('')
  const [developer, setDeveloper] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const total = SEVERITIES.reduce((n, s) => n + (summary?.[s] || 0), 0)

  const openEditor = () => {
    setDomains(brand.officialDomains.join(', '))
    setHandles(brand.officialHandles.join(', '))
    setDeveloper(brand.officialDeveloper || '')
    setError('')
    setEditing(true)
  }

  const save = async e => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      await onSave({
        officialDomains: toList(domains),
        officialHandles: toList(handles),
        officialDeveloper: developer
      })
      setEditing(false)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="border-b border-cyber-border">
      <div className="mx-auto w-full max-w-6xl px-5 py-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-semibold tracking-tight">{brand.name}</h1>
            <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-400">
              <span>
                Official website{brand.officialDomains.length > 1 ? 's' : ''}:{' '}
                <span className="font-mono text-slate-200">{brand.officialDomains.join(', ')}</span>
              </span>
              <button onClick={openEditor} className="inline-flex items-center gap-1 text-slate-400 underline-offset-4 hover:text-white hover:underline">
                <Pencil className="h-3.5 w-3.5" aria-hidden="true" /> Edit official identifiers
              </button>
            </p>
          </div>
          <Button variant="quiet" onClick={onChangeBrand}>Change brand</Button>
        </div>

        <div className="mt-4 space-y-2">
          {brand.domainAssumed && (
            <Notice tone="warn">
              We assumed your website is <b className="font-mono">{brand.officialDomains[0]}</b>. If that is wrong,
              edit the official identifiers so your real site is not flagged.
            </Notice>
          )}
          {brand.aiEnriched && (
            <Notice>
              AI suggested these identifiers. Check them before you rely on the results.
            </Notice>
          )}
          {!brand.officialDeveloper && (
            <Notice>
              Add the developer name shown on Google Play to get accurate results when scanning for copycat apps.
            </Notice>
          )}
        </div>

        {editing && (
          <form onSubmit={save} className="mt-4 grid gap-4 rounded-xl border border-cyber-border bg-cyber-card p-4 sm:grid-cols-3">
            <Field label="Official websites" hint="Separate with commas">
              <input className={inputClass} value={domains} onChange={e => setDomains(e.target.value)} />
            </Field>
            <Field label="Official social usernames" hint="Without the @">
              <input className={inputClass} value={handles} onChange={e => setHandles(e.target.value)} />
            </Field>
            <Field label="Google Play developer name">
              <input className={inputClass} value={developer} onChange={e => setDeveloper(e.target.value)} placeholder="Spotify AB" />
            </Field>
            {error && <div className="sm:col-span-3"><Notice tone="error">{error}</Notice></div>}
            <div className="flex gap-2 sm:col-span-3">
              <Button type="submit" variant="primary" busy={saving}>Save changes</Button>
              <Button type="button" variant="quiet" onClick={() => setEditing(false)}>Cancel</Button>
            </div>
          </form>
        )}

        <div className="mt-6">
          <div className="flex h-2 overflow-hidden rounded-full bg-cyber-border" aria-hidden="true">
            {SEVERITIES.map(s => (summary?.[s] ? <div key={s} className={SEV[s].bar} style={{ width: `${(summary[s] / total) * 100}%` }} /> : null))}
          </div>
          <div className="mt-3 flex flex-wrap items-baseline gap-x-6 gap-y-1 text-sm">
            <span className="text-slate-200"><b className="text-base">{total}</b> possible threats</span>
            {SEVERITIES.map(s => (
              <span key={s} className={SEV[s].text}>{summary?.[s] || 0} {SEV[s].label.toLowerCase()}</span>
            ))}
            {stats && (
              <span className="text-slate-500">
                {stats.socialThreats} social and {stats.suspiciousApps} app threats confirmed by scans
              </span>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
