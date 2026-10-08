// All calls go through the Vite proxy (/api -> Node server).
async function request(path, { method = 'GET', body, signal } = {}) {
  let res
  try {
    res = await fetch(path, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      signal
    })
  } catch {
    throw new Error('Cannot reach the server. Start it with "npm run dev" from the project folder.')
  }
  const data = await res.json().catch(() => ({}))
  if (!res.ok || data.success === false) {
    throw new Error(data.message || data.error || `Request failed (${res.status})`)
  }
  return data
}

export const api = {
  health: () => request('/api/health'),
  resolveBrand: body => request('/api/brands/resolve', { method: 'POST', body }),
  updateBrand: (key, body) => request(`/api/brands/${key}`, { method: 'PATCH', body }),
  queue: key => request(`/api/threats/${key}`),
  dashboard: key => request(`/api/dashboard?brand=${key}`),
  runScan: body => request('/api/scan/run', { method: 'POST', body }),
  checkName: body => request('/api/check-name', { method: 'POST', body }),
  analyzeThreat: body => request('/api/ai/analyze-threat', { method: 'POST', body }),
  takedownDraft: body => request('/api/ai/takedown-draft', { method: 'POST', body })
}

// Streams the Copilot reply (Server-Sent Events over fetch, so we can send a POST body)
export async function streamChat({ message, history, context, signal, onChunk }) {
  const res = await fetch('/api/ai/chat/stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, history, context }),
    signal
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.message || 'The Copilot is unavailable right now.')
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const events = buffer.split('\n\n')
    buffer = events.pop()

    for (const evt of events) {
      const name = /^event: (.+)$/m.exec(evt)?.[1]
      const data = JSON.parse(/^data: (.+)$/m.exec(evt)?.[1] || '{}')
      if (name === 'chunk') onChunk(data.text)
      if (name === 'error') throw new Error(data.message)
    }
  }
}
