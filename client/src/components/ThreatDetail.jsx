import { useEffect, useState } from 'react'
import { Copy, ExternalLink, MessageSquare, ShieldAlert, Sparkles } from 'lucide-react'
import { api } from '../api.js'
import { Button, DiffText, Notice, RiskMeter, SevTag } from './ui.jsx'

const VERDICT_TONE = { MALICIOUS: 'text-rose-300', SUSPICIOUS: 'text-amber-200', LIKELY_BENIGN: 'text-emerald-300' }
const VERDICT_LABEL = { MALICIOUS: 'Likely malicious', SUSPICIOUS: 'Suspicious', LIKELY_BENIGN: 'Likely harmless' }
const KIND_LABEL = { domain: 'Website', social: 'Social account', app: 'App' }

export default function ThreatDetail({ threat, brand, aiEnabled, onAsk }) {
  const [analysis, setAnalysis] = useState(null)
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  // Start fresh whenever a different threat is selected
  useEffect(() => {
    setAnalysis(null); setDraft(''); setBusy(''); setError(''); setCopied(false)
  }, [threat?.id])

  if (!threat) {
    return (
      <div className="rounded-xl border border-dashed border-cyber-border px-6 py-16 text-center text-sm text-slate-500">
        Select an item to see why it was flagged.
      </div>
    )
  }

  const run = async (name, fn) => {
    setBusy(name); setError('')
    try { await fn() } catch (e) { setError(e.message) } finally { setBusy('') }
  }

  const analyze = () => run('analyze', async () => {
    const r = await api.analyzeThreat({ asset: threat.asset, brandKey: brand.key })
    setAnalysis(r.aiAnalysis)
  })
  const takedown = () => run('takedown', async () => {
    const r = await api.takedownDraft({ asset: { ...threat.asset, identifier: threat.identifier }, brandKey: brand.key })
    setDraft(r.draft)
  })
  const copy = async () => {
    await navigator.clipboard.writeText(draft)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <article className="space-y-5 rounded-xl border border-cyber-border bg-cyber-card p-5 lg:sticky lg:top-4">
      <header>
        <p className="text-sm text-slate-400">{KIND_LABEL[threat.kind]} on {threat.platformLabel}</p>
        <h2 className="mt-1 break-all text-xl">
          <DiffText text={threat.identifier} brand={brand.brandLabel} kind={threat.kind} />
        </h2>
        {threat.title && threat.title !== threat.identifier && <p className="mt-1 text-sm text-slate-400">{threat.title}</p>}
      </header>

      {threat.source === 'generated' && (
        <Notice tone="warn">
          This is a name pattern an impersonator could use. We have not checked whether it exists or is live, so verify it before you act.
        </Notice>
      )}

      <div>
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-medium text-slate-200">Risk</span>
          <SevTag severity={threat.risk.severity} />
        </div>
        <RiskMeter score={threat.risk.riskScore} severity={threat.risk.severity} />
      </div>

      <div>
        <h3 className="text-sm font-medium text-slate-200">Why it was flagged</h3>
        {threat.risk.signals.length ? (
          <ul className="mt-2 space-y-1.5">
            {threat.risk.signals.map((s, i) => (
              <li key={i} className="flex items-start justify-between gap-3 text-sm text-slate-300">
                <span>{s.label}</span>
                {typeof s.weight === 'number' && <span className="shrink-0 font-mono text-xs text-slate-500">+{s.weight}</span>}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-slate-500">No specific signals were recorded.</p>
        )}
      </div>

      {(threat.developer || threat.url) && (
        <dl className="space-y-1 text-sm">
          {threat.developer && (
            <div className="flex gap-2"><dt className="text-slate-500">Developer</dt><dd className="text-slate-200">{threat.developer}</dd></div>
          )}
          {threat.url && (
            <div className="flex gap-2">
              <dt className="text-slate-500">Listing</dt>
              <dd><a className="inline-flex items-center gap-1 text-sky-300 underline-offset-4 hover:underline" href={threat.url} target="_blank" rel="noreferrer noopener">
                Open on Google Play <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              </a></dd>
            </div>
          )}
        </dl>
      )}

      <div className="flex flex-wrap gap-2 border-t border-cyber-border pt-4">
        <Button onClick={analyze} busy={busy === 'analyze'} disabled={!aiEnabled}>
          <Sparkles className="h-4 w-4" aria-hidden="true" /> Explain with AI
        </Button>
        <Button onClick={takedown} busy={busy === 'takedown'} disabled={!aiEnabled}>
          <ShieldAlert className="h-4 w-4" aria-hidden="true" /> Draft takedown notice
        </Button>
        <Button variant="quiet" onClick={() => onAsk(threat)}>
          <MessageSquare className="h-4 w-4" aria-hidden="true" /> Ask Copilot
        </Button>
      </div>
      {!aiEnabled && <p className="text-xs text-slate-500">AI is off. Add GEMINI_API_KEY to server/.env and restart the server to turn it on.</p>}
      {error && <Notice tone="error">{error}</Notice>}

      {analysis && (
        <section className="space-y-3 rounded-lg border border-cyber-border bg-cyber-dark p-4">
          <p className="text-sm">
            <b className={VERDICT_TONE[analysis.verdict] || 'text-slate-200'}>{VERDICT_LABEL[analysis.verdict] || analysis.verdict}</b>
            <span className="text-slate-500"> with {analysis.confidence}% confidence</span>
          </p>
          <p className="text-sm leading-relaxed text-slate-300">{analysis.summary}</p>
          {analysis.indicators?.length > 0 && (
            <ul className="list-disc space-y-1 pl-5 text-sm text-slate-300">
              {analysis.indicators.map((x, i) => <li key={i}>{x}</li>)}
            </ul>
          )}
          {analysis.recommendedActions?.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-slate-200">What to do next</h4>
              <ol className="mt-1 list-decimal space-y-1 pl-5 text-sm text-slate-300">
                {analysis.recommendedActions.map((x, i) => <li key={i}>{x}</li>)}
              </ol>
            </div>
          )}
        </section>
      )}

      {draft && (
        <section>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-medium text-slate-200">Takedown notice draft</h3>
            <Button variant="quiet" onClick={copy} className="px-2 py-1"><Copy className="h-4 w-4" aria-hidden="true" />{copied ? 'Copied' : 'Copy'}</Button>
          </div>
          <textarea readOnly value={draft} rows={10} className="w-full resize-y rounded-lg border border-cyber-border bg-cyber-dark p-3 text-sm leading-relaxed text-slate-200" />
          <p className="mt-1 text-xs text-slate-500">Review and fill in the [placeholders] before you send it. Nothing is sent from here.</p>
        </section>
      )}
    </article>
  )
}
