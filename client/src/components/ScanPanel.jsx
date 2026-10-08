import { useState } from 'react'
import { Search } from 'lucide-react'
import { api } from '../api.js'
import { Button, DiffText, Field, Notice, RiskMeter, inputClass } from './ui.jsx'

const PLATFORMS = ['Instagram', 'X', 'Facebook']

export default function ScanPanel({ brand, health, onScanned }) {
  const [busy, setBusy] = useState('')
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  const [platform, setPlatform] = useState('Instagram')
  const [usernames, setUsernames] = useState('')

  const [name, setName] = useState('')
  const [check, setCheck] = useState(null)
  const [checkError, setCheckError] = useState('')

  const scan = async (type, accounts = []) => {
    setBusy(type); setError(''); setResult(null)
    try {
      const r = await api.runScan({ brandKey: brand.key, type, accounts })
      setResult(r)
      await onScanned()
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy('')
    }
  }

  const scanAccounts = () => {
    const accounts = usernames.split(/[\n,]/).map(u => u.trim()).filter(Boolean).map(username => ({ platform, username }))
    scan('social', accounts)
  }

  const runCheck = async e => {
    e.preventDefault()
    setCheckError(''); setCheck(null)
    try {
      setCheck({ input: name.trim(), ...(await api.checkName({ input: name.trim(), brandKey: brand.key })) })
    } catch (err) {
      setCheckError(err.message)
    }
  }

  return (
    <div className="space-y-8">
      <div className="grid gap-8 lg:grid-cols-2">
        <section>
          <h2 className="text-lg font-semibold">Copycat apps on Google Play</h2>
          <p className="mt-1.5 text-sm leading-relaxed text-slate-400">
            Searches Google Play for apps using the name {brand.name} and compares each app's name, developer and description with the real one.
          </p>
          <Button className="mt-4" variant="primary" busy={busy === 'apps'} disabled={!!busy} onClick={() => scan('apps')}>
            <Search className="h-4 w-4" aria-hidden="true" /> Scan Google Play
          </Button>
          {health && health.detectionService !== 'online' && (
            <p className="mt-2 text-xs text-amber-200">The detection service is offline. Start it with "npm run dev:detection".</p>
          )}
        </section>

        <section>
          <h2 className="text-lg font-semibold">Fake social accounts</h2>
          <p className="mt-1.5 text-sm leading-relaxed text-slate-400">
            We always check common impersonation names for {brand.name}. Add specific accounts you have seen to check them too.
          </p>
          <div className="mt-4 flex gap-2">
            <select aria-label="Platform" value={platform} onChange={e => setPlatform(e.target.value)} className={`${inputClass} w-32 shrink-0`}>
              {PLATFORMS.map(p => <option key={p}>{p}</option>)}
            </select>
            <textarea
              aria-label="Usernames to check"
              value={usernames}
              onChange={e => setUsernames(e.target.value)}
              rows={2}
              placeholder={`@${brand.brandLabel}_help\n@${brand.brandLabel}care`}
              className={`${inputClass} resize-y font-mono`}
            />
          </div>
          <Button className="mt-3" variant="primary" busy={busy === 'social'} disabled={!!busy} onClick={scanAccounts}>
            <Search className="h-4 w-4" aria-hidden="true" /> Scan social accounts
          </Button>
        </section>
      </div>

      {error && <Notice tone="error">{error}</Notice>}

      {result && (
        <Notice tone={result.errors?.length ? 'warn' : 'info'}>
          Checked {result.scanned} item{result.scanned === 1 ? '' : 's'} and flagged {result.flagged}. They are now in the Threats tab.
          {result.persisted === false && ' Scan history was not saved because the database is not connected.'}
          {result.engines?.social === 'built-in-fallback' && ' The detection service was offline, so the built-in checker scored the social accounts.'}
          {result.errors?.map((e, i) => <span key={i} className="mt-1 block">{e.message}</span>)}
        </Notice>
      )}

      <section className="border-t border-cyber-border pt-8">
        <h2 className="text-lg font-semibold">Check a name</h2>
        <p className="mt-1.5 text-sm text-slate-400">Paste a website, username or app name you came across to see how closely it imitates {brand.name}.</p>
        <form onSubmit={runCheck} className="mt-4 flex max-w-xl gap-2">
          <input className={`${inputClass} font-mono`} value={name} onChange={e => setName(e.target.value)} placeholder={`${brand.brandLabel}-login.xyz`} aria-label="Name to check" />
          <Button type="submit" disabled={!name.trim()}>Check</Button>
        </form>
        {checkError && <Notice tone="error" className="mt-3 max-w-xl">{checkError}</Notice>}
        {check && (
          <div className="mt-4 max-w-xl space-y-3 rounded-xl border border-cyber-border bg-cyber-card p-4">
            <DiffText text={check.input} brand={check.brandLabel} kind={/\./.test(check.input) ? 'domain' : 'social'} className="text-lg" />
            <RiskMeter score={check.risk.riskScore} severity={check.risk.severity === 'official' ? 'low' : check.risk.severity} />
            <p className="text-sm text-slate-300">
              {check.similarity}% similar to "{check.brandLabel}".
              {check.hasHomoglyphs && ' It swaps in look-alike characters.'}
              {check.risk.severity === 'official' && ' This matches an official identifier for the brand.'}
            </p>
            {check.risk.signals.length > 0 && check.risk.severity !== 'official' && (
              <ul className="list-disc space-y-1 pl-5 text-sm text-slate-400">{check.risk.signals.map((s, i) => <li key={i}>{s.label}</li>)}</ul>
            )}
          </div>
        )}
      </section>
    </div>
  )
}
