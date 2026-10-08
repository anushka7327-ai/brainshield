import { useCallback, useEffect, useState } from 'react'
import { Shield } from 'lucide-react'
import { api } from './api.js'
import BrandPicker from './components/BrandPicker.jsx'
import BrandHeader from './components/BrandHeader.jsx'
import ThreatQueue from './components/ThreatQueue.jsx'
import ThreatDetail from './components/ThreatDetail.jsx'
import ScanPanel from './components/ScanPanel.jsx'
import Copilot from './components/Copilot.jsx'
import { Notice } from './components/ui.jsx'

const TABS = [
  { id: 'threats', label: 'Threats' },
  { id: 'scan', label: 'Scan' },
  { id: 'copilot', label: 'Copilot' }
]

function ServiceStatus({ health }) {
  if (!health) return null
  const items = [
    { label: 'Database', ok: health.database === 'connected' },
    { label: 'Detection service', ok: health.detectionService === 'online' },
    { label: 'AI', ok: health.aiEnabled }
  ]
  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400" aria-label="Service status">
      {items.map(i => (
        <li key={i.label} className="flex items-center gap-1.5">
          <span className={`h-2 w-2 rounded-full ${i.ok ? 'bg-emerald-400' : 'bg-slate-600'}`} aria-hidden="true" />
          {i.label} {i.ok ? 'on' : 'off'}
        </li>
      ))}
    </ul>
  )
}

export default function App() {
  const [health, setHealth] = useState(null)
  const [serverDown, setServerDown] = useState(false)
  const [brand, setBrand] = useState(null)
  const [queue, setQueue] = useState({ threats: [], summary: null })
  const [stats, setStats] = useState(null)
  const [tab, setTab] = useState('threats')
  const [selectedId, setSelectedId] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const loadHealth = useCallback(() => {
    api.health().then(h => { setHealth(h); setServerDown(false) }).catch(() => setServerDown(true))
  }, [])

  useEffect(() => { loadHealth() }, [loadHealth])

  const refresh = useCallback(async key => {
    const q = await api.queue(key)
    setQueue({ threats: q.threats, summary: q.summary })
    setBrand(q.profile)
    api.dashboard(key).then(d => setStats(d.data)).catch(() => setStats(null))
    loadHealth()
  }, [loadHealth])

  const chooseBrand = async ({ name, domain }) => {
    setLoading(true); setError('')
    try {
      const r = await api.resolveBrand({ name, domain })
      await refresh(r.brandKey)
      setSelectedId(null)
      setTab('threats')
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const saveIdentifiers = async changes => {
    const r = await api.updateBrand(brand.key, changes)
    setBrand(r.profile)
    await refresh(brand.key)
  }

  const selected = queue.threats.find(t => t.id === selectedId) || null
  const askAbout = threat => { setSelectedId(threat.id); setTab('copilot') }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-cyber-border">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-3">
          <div className="flex items-center gap-2 font-semibold">
            <Shield className="h-5 w-5 text-cyber-accent" aria-hidden="true" /> SentinelDRP
          </div>
          <ServiceStatus health={health} />
        </div>
      </header>

      {serverDown && (
        <div className="mx-auto w-full max-w-6xl px-5 pt-4">
          <Notice tone="error">Cannot reach the server. Start everything with "npm run dev" from the project folder, then reload.</Notice>
        </div>
      )}

      {!brand ? (
        <BrandPicker onSubmit={chooseBrand} loading={loading} error={error} aiEnabled={health?.aiEnabled} />
      ) : (
        <>
          <BrandHeader
            brand={brand}
            summary={queue.summary}
            stats={stats}
            onSave={saveIdentifiers}
            onChangeBrand={() => { setBrand(null); setQueue({ threats: [], summary: null }); setStats(null); setSelectedId(null) }}
          />

          <nav className="border-b border-cyber-border" aria-label="Sections">
            <div className="mx-auto flex w-full max-w-6xl gap-6 px-5">
              {TABS.map(t => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  aria-current={tab === t.id ? 'page' : undefined}
                  className={`-mb-px border-b-2 py-3 text-sm font-medium transition-colors ${
                    tab === t.id ? 'border-cyber-accent text-white' : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </nav>

          <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-6">
            {tab === 'threats' && (
              <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
                <ThreatQueue threats={queue.threats} brandLabel={brand.brandLabel} selectedId={selectedId} onSelect={setSelectedId} />
                <ThreatDetail threat={selected} brand={brand} aiEnabled={!!health?.aiEnabled} onAsk={askAbout} />
              </div>
            )}
            {tab === 'scan' && <ScanPanel brand={brand} health={health} onScanned={() => refresh(brand.key)} />}
            {tab === 'copilot' && <Copilot brand={brand} threat={selected} summary={queue.summary} aiEnabled={!!health?.aiEnabled} />}
          </main>
        </>
      )}
    </div>
  )
}
