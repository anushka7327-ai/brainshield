import { useState } from 'react'
import { Button, Field, Notice, inputClass } from './ui.jsx'

const EXAMPLES = ['Spotify', 'HDFC Bank', 'Zomato', 'Nike']

export default function BrandPicker({ onSubmit, loading, error, aiEnabled }) {
  const [name, setName] = useState('')
  const [domain, setDomain] = useState('')

  const submit = e => {
    e.preventDefault()
    if (name.trim()) onSubmit({ name: name.trim(), domain: domain.trim() })
  }

  return (
    <main className="mx-auto w-full max-w-2xl px-5 pb-20 pt-16 sm:pt-24">
      <h1 className="text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
        Which brand do you want to protect?
      </h1>
      <p className="mt-4 max-w-xl text-base leading-relaxed text-slate-400">
        Enter any brand. We look for look-alike websites, fake social accounts and copycat apps, and show
        exactly which letters give each one away.
      </p>

      <form onSubmit={submit} className="mt-10 space-y-5">
        <Field label="Brand name">
          <input
            className={`${inputClass} py-3 text-base`}
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="For example, Spotify"
            autoFocus
            maxLength={80}
          />
        </Field>
        <Field
          label="Official website (optional)"
          hint={aiEnabled ? 'Leave it blank and AI will suggest the official identifiers for you to review.' : 'Leave it blank and we will assume the brand name plus .com.'}
        >
          <input
            className={inputClass}
            value={domain}
            onChange={e => setDomain(e.target.value)}
            placeholder="spotify.com"
            inputMode="url"
          />
        </Field>

        {error && <Notice tone="error">{error}</Notice>}

        <Button type="submit" variant="primary" busy={loading} disabled={!name.trim()} className="px-5 py-2.5">
          {loading ? 'Checking this brand' : 'Check this brand'}
        </Button>
      </form>

      <div className="mt-10">
        <p className="text-sm text-slate-500">Or try one of these:</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {EXAMPLES.map(ex => (
            <button
              key={ex}
              type="button"
              disabled={loading}
              onClick={() => onSubmit({ name: ex, domain: '' })}
              className="rounded-full border border-cyber-border px-3.5 py-1.5 text-sm text-slate-300 transition-colors hover:bg-white/5 disabled:opacity-50"
            >
              {ex}
            </button>
          ))}
        </div>
      </div>
    </main>
  )
}
