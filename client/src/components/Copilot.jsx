import { useEffect, useRef, useState } from 'react'
import { Send, Square } from 'lucide-react'
import { streamChat } from '../api.js'
import { Button, Notice, inputClass } from './ui.jsx'

export default function Copilot({ brand, threat, summary, aiEnabled }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [error, setError] = useState('')
  const abortRef = useRef(null)
  const endRef = useRef(null)

  useEffect(() => { endRef.current?.scrollIntoView({ block: 'end' }) }, [messages])
  useEffect(() => () => abortRef.current?.abort(), [])

  const suggestions = threat
    ? [`Why is ${threat.identifier} suspicious?`, 'Is this likely a real attack or a false alarm?', 'What should I do first?']
    : [`What are the biggest risks for ${brand.name}?`, 'Which kinds of attacks should I watch for?', 'How do I report a fake social account?']

  const send = async text => {
    const message = (text ?? input).trim()
    if (!message || streaming) return
    setInput(''); setError(''); setStreaming(true)

    const history = messages
    setMessages([...history, { role: 'user', content: message }, { role: 'assistant', content: '' }])

    const controller = new AbortController()
    abortRef.current = controller

    try {
      await streamChat({
        message,
        history,
        signal: controller.signal,
        context: threat
          ? { brand: brand.name, selectedThreat: { identifier: threat.identifier, kind: threat.kind, platform: threat.platformLabel, risk: threat.risk } }
          : { brand: brand.name, officialDomains: brand.officialDomains, threatCounts: summary },
        onChunk: chunk =>
          setMessages(prev => {
            const next = [...prev]
            next[next.length - 1] = { role: 'assistant', content: next[next.length - 1].content + chunk }
            return next
          })
      })
    } catch (e) {
      if (e.name !== 'AbortError') setError(e.message)
    } finally {
      setStreaming(false)
    }
  }

  if (!aiEnabled) {
    return <Notice>The Copilot needs AI. Add GEMINI_API_KEY to server/.env and restart the server.</Notice>
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col">
      <p className="mb-3 text-sm text-slate-400">
        {threat
          ? <>Asking about <span className="font-mono text-slate-200">{threat.identifier}</span>.</>
          : <>Ask anything about {brand.name}'s exposure. Select a threat first to ask about it specifically.</>}
      </p>

      <div className="min-h-[260px] space-y-4 rounded-xl border border-cyber-border bg-cyber-card p-4" aria-live="polite">
        {messages.length === 0 ? (
          <div className="flex flex-wrap gap-2">
            {suggestions.map(s => (
              <button key={s} onClick={() => send(s)} className="rounded-full border border-cyber-border px-3 py-1.5 text-left text-sm text-slate-300 hover:bg-white/5">
                {s}
              </button>
            ))}
          </div>
        ) : (
          messages.map((m, i) => (
            <div key={i} className={m.role === 'user' ? 'flex justify-end' : ''}>
              <p className={`max-w-[85%] whitespace-pre-wrap text-sm leading-relaxed ${m.role === 'user' ? 'rounded-xl bg-white/10 px-3.5 py-2 text-slate-100' : 'text-slate-300'}`}>
                {m.content || (streaming && i === messages.length - 1 ? 'Thinking...' : '')}
              </p>
            </div>
          ))
        )}
        <div ref={endRef} />
      </div>

      {error && <Notice tone="error" className="mt-3">{error}</Notice>}

      <form onSubmit={e => { e.preventDefault(); send() }} className="mt-3 flex gap-2">
        <input className={inputClass} value={input} onChange={e => setInput(e.target.value)} placeholder="Ask the Copilot" aria-label="Message" maxLength={4000} />
        {streaming ? (
          <Button type="button" onClick={() => abortRef.current?.abort()}><Square className="h-4 w-4" aria-hidden="true" /> Stop</Button>
        ) : (
          <Button type="submit" variant="primary" disabled={!input.trim()}><Send className="h-4 w-4" aria-hidden="true" /> Send</Button>
        )}
      </form>
    </div>
  )
}
