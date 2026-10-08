import { Loader2 } from 'lucide-react'

export const SEVERITIES = ['critical', 'high', 'medium', 'low']

export const SEV = {
  critical: { label: 'Critical', dot: 'bg-rose-500', text: 'text-rose-300', bar: 'bg-rose-500' },
  high: { label: 'High', dot: 'bg-orange-400', text: 'text-orange-300', bar: 'bg-orange-400' },
  medium: { label: 'Medium', dot: 'bg-yellow-300', text: 'text-yellow-200', bar: 'bg-yellow-300' },
  low: { label: 'Low', dot: 'bg-slate-500', text: 'text-slate-400', bar: 'bg-slate-500' }
}

export function SevTag({ severity }) {
  const s = SEV[severity] || SEV.low
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${s.text}`}>
      <span className={`h-2 w-2 rounded-full ${s.dot}`} aria-hidden="true" />
      {s.label}
    </span>
  )
}

export function RiskMeter({ score, severity }) {
  const s = SEV[severity] || SEV.low
  return (
    <div className="flex items-center gap-3" role="meter" aria-valuenow={score} aria-valuemin={0} aria-valuemax={100} aria-label="Risk score">
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-cyber-border">
        <div className={`h-full rounded-full ${s.bar}`} style={{ width: `${Math.max(2, score)}%` }} />
      </div>
      <span className="w-8 text-right font-mono text-sm tabular-nums text-slate-200">{score}</span>
    </div>
  )
}

// Shows how a suspect name differs from the real brand name: letters that are not
// part of the brand name are underlined in red. Only the name part of a domain is compared.
export function DiffText({ text, brand, kind, className = '' }) {
  const value = String(text || '')
  const dot = kind === 'domain' ? value.indexOf('.') : -1
  const head = dot > 0 ? value.slice(0, dot) : value
  const tail = dot > 0 ? value.slice(dot) : ''

  const a = [...head.toLowerCase().replace(/^@/, '')]
  const b = [...String(brand || '').toLowerCase()]
  const offset = head.startsWith('@') ? 1 : 0

  // Longest common subsequence decides which letters "belong" to the brand name
  const dp = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(0))
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1])
    }
  }
  const same = new Set()
  let i = 0
  let j = 0
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { same.add(i + offset); i++; j++ }
    else if (dp[i + 1][j] >= dp[i][j + 1]) i++
    else j++
  }

  return (
    <span className={`font-mono ${className}`}>
      {[...head].map((ch, idx) =>
        same.has(idx) || (offset && idx === 0)
          ? <span key={idx}>{ch}</span>
          : <span key={idx} className="text-rose-300 underline decoration-rose-400 decoration-2 underline-offset-4">{ch}</span>
      )}
      <span className="text-slate-500">{tail}</span>
    </span>
  )
}

const BUTTON = {
  primary: 'bg-cyber-accent text-cyber-dark font-semibold hover:brightness-110',
  secondary: 'border border-cyber-border text-slate-200 hover:bg-white/5',
  quiet: 'text-slate-300 hover:text-white hover:bg-white/5'
}

export function Button({ variant = 'secondary', busy = false, className = '', children, disabled, ...props }) {
  return (
    <button
      {...props}
      disabled={disabled || busy}
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${BUTTON[variant]} ${className}`}
    >
      {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
      {children}
    </button>
  )
}

export function Field({ label, hint, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-slate-200">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
    </label>
  )
}

export const inputClass =
  'w-full rounded-lg border border-cyber-border bg-cyber-dark px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:border-cyber-accent/60'

const TONES = {
  info: 'border-sky-400/30 bg-sky-400/5 text-sky-100',
  warn: 'border-amber-400/40 bg-amber-400/5 text-amber-100',
  error: 'border-rose-400/40 bg-rose-400/5 text-rose-100'
}

export function Notice({ tone = 'info', children, className = '' }) {
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={`rounded-lg border px-3.5 py-2.5 text-sm leading-relaxed ${TONES[tone]} ${className}`}>
      {children}
    </div>
  )
}

export function Segmented({ label, value, onChange, options }) {
  return (
    <div role="group" aria-label={label} className="inline-flex rounded-lg border border-cyber-border p-0.5">
      {options.map(o => (
        <button
          key={o.value}
          type="button"
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
          className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
            value === o.value ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
