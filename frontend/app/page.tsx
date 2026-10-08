'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { AlertTriangle, Bell, ChevronRight, CircleUserRound, Home, Search, Shield, Smartphone } from 'lucide-react'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { brandApi } from '../services/api'
import { dashboardToView, findRemembered, getBrandForm, getBrandKey, handleFrom, isAppPlatform, queueItemToRow, rememberRows, setBrandForm, setBrandName, sortRows, splitKeywords, threatDocToRow, type Row } from '../lib/mappers'

const navItems = [
  { label: 'Dashboard', href: '/', icon: Home },
  { label: 'Brand Profile', href: '/brand-profile', icon: Shield },
  { label: 'Social Monitoring', href: '/social-monitoring', icon: Search },
  { label: 'App Monitoring', href: '/app-monitoring', icon: Smartphone },
]

const recentThreats = [
  { id: 'paytm-support', name: 'Paytm Support', platform: 'Instagram', risk: 'HIGH', score: 95 },
  { id: 'paytm-rewards', name: 'Paytm Rewards', platform: 'Facebook', risk: 'MEDIUM', score: 78 },
  { id: 'paytm-wallet', name: 'Paytm Wallet+', platform: 'Play Store', risk: 'HIGH', score: 91 },
]

const socialThreats = [
  { id: 'paytm-support', name: 'Paytm Support', platform: 'Instagram', similarity: 95, risk: 'High', reason: 'Uses brand name and support keyword. Not official.' },
  { id: 'paytm-official', name: 'PayTm Official', platform: 'Facebook', similarity: 88, risk: 'High', reason: 'Brand name variant with no verified ownership.' },
  { id: 'paytm-rewards', name: 'P4ytm Rewards', platform: 'X', similarity: 80, risk: 'Medium', reason: 'Intentional spelling variation and promotional language.' },
]

const appThreats = [
  { id: 'wallet-plus', name: 'Paytm Wallet+', developer: 'XYZ Apps', score: 91, risk: 'High', description: 'A wallet application using Paytm naming and visual identity.' },
  { id: 'secure', name: 'Paytm Secure', developer: 'ABC Tech', score: 74, risk: 'Medium', description: 'A security utility with a similar brand name.' },
]


const errorText = (err: any) => err?.response?.data?.message || (err?.response ? `Request failed (${err.response.status})` : 'Cannot reach the server. Start it with "npm run dev:web".')

// Loads saved threats for the active brand and runs live scans through the backend.
function useMonitor(kind: 'social' | 'app', sample: any[]) {
  const [rows, setRows] = useState<any[]>(sample)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [scanned, setScanned] = useState(false)
  const keep = (r: Row) => (kind === 'app') === isAppPlatform(r.platform)

  useEffect(() => {
    brandApi.threats(getBrandKey()).then(res => {
      const saved = (res.data?.data || []).map(threatDocToRow).filter(keep)
      if (saved.length) { setRows(sortRows(saved)); rememberRows(saved) }
    }).catch(() => {})
  }, [])

  const scan = async () => {
    setBusy(true); setError('')
    try {
      const res = await (kind === 'app' ? brandApi.appScan : brandApi.socialScan)(getBrandKey())
      const all: Row[] = (res.data?.threats || []).map(queueItemToRow)
      rememberRows(all)
      setRows(sortRows(all.filter(r => r.risk !== 'Low')))
      setScanned(true)
    } catch (err) { setError(errorText(err)) }
    setBusy(false)
  }
  return { rows, scan, busy, error, scanned }
}

function RiskBadge({ risk }: { risk: string }) {
  return <span className={`risk risk-${risk.toLowerCase()}`}>{risk}</span>
}

function Shell({ children, title, eyebrow }: { children: React.ReactNode; title: string; eyebrow: string }) {
  const pathname = usePathname()
  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand-lockup"><div className="brand-mark"><Shield size={19} /></div><div><strong>BrandShield</strong><span>AI PROTECTION</span></div></div>
      <nav className="main-nav" aria-label="Main navigation">
        <p className="nav-label">WORKSPACE</p>
        {navItems.map(({ label, href, icon: Icon }) => <Link key={href} href={href} className={`nav-item ${pathname === href ? 'active' : ''}`}><Icon size={18} /><span>{label}</span></Link>)}
        <Link href="/threat/paytm-support" className={`nav-item ${pathname.startsWith('/threat') ? 'active' : ''}`}><AlertTriangle size={18} /><span>Threat Intelligence</span></Link>
      </nav>
      <div className="sidebar-footer"><div className="status-dot" /> <span>Monitoring active</span></div>
    </aside>
    <main className="main-content">
      <header className="topbar"><div className="breadcrumbs"><span>BRANDSHIELD AI</span><ChevronRight size={14} /><b>{title.toUpperCase()}</b></div><div className="top-actions"><button className="icon-button" aria-label="Notifications"><Bell size={18} /><i /></button><div className="user-avatar">PS</div><span className="user-name">Protection team</span></div></header>
      <div className="page-wrap"><div className="page-heading"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1></div><div className="date-chip">Last synced <b>Just now</b></div></div>{children}</div>
    </main>
  </div>
}

function StatCard({ label, value, change, tone, icon: Icon }: { label: string; value: string; change: string; tone: string; icon: any }) {
  return <div className="stat-card"><div className={`stat-icon ${tone}`}><Icon size={19} /></div><p>{label}</p><strong>{value}</strong><span className="stat-change">{change}</span></div>
}

function Dashboard() {
  const [platformData, setPlatformData] = useState([{ name: 'Instagram', value: 7 }, { name: 'Facebook', value: 5 }, { name: 'X', value: 3 }, { name: 'Play Store', value: 9 }])
  const [levelData, setLevelData] = useState([{ name: 'High', value: 8 }, { name: 'Medium', value: 10 }, { name: 'Low', value: 6 }])
  const [s, setS] = useState({ total: 24, high: 8, social: 11, apps: 13 })
  const [live, setLive] = useState(false)
  const [recent, setRecent] = useState<any[]>(recentThreats)
  useEffect(() => {
    const key = getBrandKey()
    brandApi.dashboard(key).then(res => {
      const v = dashboardToView(res.data?.data)
      setS(v.totals); setPlatformData(v.platformData); setLevelData(v.levelData); setLive(true)
    }).catch(() => {})
    brandApi.threats(key).then(res => {
      const rows = (res.data?.data || []).map(threatDocToRow)
      if (rows.length) { setRecent(sortRows(rows).slice(0, 5)); rememberRows(rows) }
    }).catch(() => {})
  }, [])
  return <Shell title="Dashboard" eyebrow="Overview / Security posture"><section className="stats-grid"><StatCard label="Total Threats" value={String(s.total)} change={live ? 'From saved scans' : '+12% from last scan'} tone="blue" icon={AlertTriangle} /><StatCard label="High Risk" value={String(s.high)} change={live ? 'Require attention' : '3 require attention'} tone="red" icon={Shield} /><StatCard label="Social Threats" value={String(s.social)} change={live ? 'Across social platforms' : 'Across 3 platforms'} tone="violet" icon={Search} /><StatCard label="Suspicious Apps" value={String(s.apps)} change={live ? 'App store listings' : '2 new this week'} tone="amber" icon={Smartphone} /></section>
    <section className="charts-grid"><div className="panel chart-panel"><div className="panel-heading"><div><h2>Threats by platform</h2><p>Distribution across monitored channels</p></div><span className="panel-kicker">THIS MONTH</span></div><div className="chart-wrap"><ResponsiveContainer width="100%" height="100%"><BarChart data={platformData} barSize={30}><CartesianGrid vertical={false} stroke="#e8edf4" /><XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#7b8798', fontSize: 12 }} /><YAxis axisLine={false} tickLine={false} tick={{ fill: '#7b8798', fontSize: 12 }} /><Tooltip cursor={{ fill: '#f5f7fb' }} /><Bar dataKey="value" fill="#315cdb" radius={[5,5,0,0]} /></BarChart></ResponsiveContainer></div></div><div className="panel chart-panel"><div className="panel-heading"><div><h2>Threat levels</h2><p>Risk severity breakdown</p></div><span className="panel-kicker">{s.total} TOTAL</span></div><div className="chart-wrap"><ResponsiveContainer width="100%" height="100%"><AreaChart data={levelData}><defs><linearGradient id="riskFill" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#315cdb" stopOpacity={0.2} /><stop offset="95%" stopColor="#315cdb" stopOpacity={0} /></linearGradient></defs><CartesianGrid vertical={false} stroke="#e8edf4" /><XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#7b8798', fontSize: 12 }} /><YAxis axisLine={false} tickLine={false} tick={{ fill: '#7b8798', fontSize: 12 }} /><Tooltip /><Area type="monotone" dataKey="value" stroke="#315cdb" strokeWidth={2.5} fill="url(#riskFill)" /></AreaChart></ResponsiveContainer></div></div></section>
    <div className="panel table-panel"><div className="panel-heading"><div><h2>Recent threats</h2><p>Latest detections from your monitoring network</p></div><Link href="/social-monitoring" className="text-link">View all threats <ChevronRight size={15} /></Link></div><ThreatTable rows={recent} /></div>
  </Shell>
}

function ThreatTable({ rows }: { rows: any[] }) { return <div className="table-scroll"><table><thead><tr><th>Threat name</th><th>Platform</th><th>Risk level</th><th>Score</th><th /></tr></thead><tbody>{rows.map(row => <tr key={row.id}><td><Link className="table-link" href={`/threat/${encodeURIComponent(row.id)}`}>{row.name}</Link></td><td>{row.platform}</td><td><RiskBadge risk={row.risk} /></td><td><span className="score">{row.score}%</span></td><td><Link className="row-action" href={`/threat/${encodeURIComponent(row.id)}`}>View details <ChevronRight size={14} /></Link></td></tr>)}</tbody></table></div> }

function BrandProfile() { const [saved, setSaved] = useState(false); const [error, setError] = useState(''); const [form, setFormState] = useState({ brandName: 'Paytm', website: 'https://paytm.com', instagram: '', facebook: '', x: '', linkedin: '', officialAppName: 'Paytm: Secure Payments', developerName: 'One97 Communications Ltd.', keywords: 'paytm, wallet, payments, support, rewards' }); useEffect(() => { setFormState(f => getBrandForm(f)) }, []); const setForm = (f: typeof form) => { setSaved(false); setFormState(f) }; const save = async (e: React.FormEvent) => { e.preventDefault(); setError(''); try { await brandApi.save({ ...form, keywords: splitKeywords(form.keywords), officialHandles: [form.instagram, form.facebook, form.x, form.linkedin].map(handleFrom).filter(Boolean) }); setBrandName(form.brandName.trim()); setBrandForm(form); setSaved(true) } catch (err) { setError(errorText(err)) } }; return <Shell title="Brand Profile" eyebrow="Configuration / Identity"><div className="profile-layout"><div className="panel form-panel"><div className="panel-heading"><div><h2>Brand identity</h2><p>Tell us what to protect across the web.</p></div><span className="completion">60% complete</span></div><form onSubmit={save}><div className="form-grid"><label>Brand name<input value={form.brandName} onChange={e => setForm({...form, brandName:e.target.value})} /></label><label>Official website<input value={form.website} onChange={e => setForm({...form, website:e.target.value})} /></label><label>Instagram<input placeholder="@paytm" value={form.instagram} onChange={e => setForm({...form, instagram:e.target.value})} /></label><label>Facebook<input placeholder="facebook.com/paytm" value={form.facebook} onChange={e => setForm({...form, facebook:e.target.value})} /></label><label>X<input placeholder="@paytm" value={form.x} onChange={e => setForm({...form, x:e.target.value})} /></label><label>LinkedIn<input placeholder="linkedin.com/company/paytm" value={form.linkedin} onChange={e => setForm({...form, linkedin:e.target.value})} /></label><label>Official app name<input value={form.officialAppName} onChange={e => setForm({...form, officialAppName:e.target.value})} /></label><label>Developer name<input value={form.developerName} onChange={e => setForm({...form, developerName:e.target.value})} /></label></div><label>Keywords<input value={form.keywords} onChange={e => setForm({...form, keywords:e.target.value})} /></label><div className="upload-row"><div className="logo-preview">P</div><div><b>Brand logo</b><p>PNG or SVG, max 2MB</p></div><button type="button" className="button secondary">Upload logo</button></div><button className="button primary" type="submit">{saved ? 'Profile saved' : 'Save brand profile'}</button>{error && <p className="muted">{error}</p>}</form></div><div className="panel profile-summary"><p className="eyebrow">CURRENT PROFILE</p><div className="summary-logo">P</div><h2>Paytm</h2><p className="muted">paytm.com</p><div className="summary-line"><span>Monitoring status</span><b className="online">Active</b></div><div className="summary-line"><span>Channels</span><b>4 connected</b></div></div></div></Shell> }

function SocialMonitoring() { const { rows, scan, busy, error, scanned } = useMonitor('social', socialThreats); return <Shell title="Social Monitoring" eyebrow="Monitoring / Social networks"><div className="monitor-hero panel"><div><p className="eyebrow">SOCIAL SCAN</p><h2>Find impersonators before they find your customers.</h2><p>We scan public profiles, posts, and handles for brand misuse across social platforms.</p></div><button className="button primary" onClick={scan} disabled={busy}><Search size={17} /> {busy ? 'Scanning...' : 'Scan social media'}</button></div><div className="panel table-panel"><div className="panel-heading"><div><h2>Detected social accounts</h2><p>{rows.length} potential threats found in the last scan</p>{error && <p className="muted">{error}</p>}</div><span className="scan-time">{scanned ? 'Scanned just now' : 'Not scanned yet'}</span></div><div className="table-scroll"><table><thead><tr><th>Account name</th><th>Platform</th><th>Similarity</th><th>Risk</th><th /></tr></thead><tbody>{rows.map(row => <tr key={row.id || row.name}><td><Link className="table-link" href={`/threat/${row.id || 'paytm-support'}`}>{row.name}</Link></td><td>{row.platform || 'Instagram'}</td><td><strong>{row.similarity || row.score}%</strong><div className="mini-progress"><i style={{width:`${row.similarity || row.score}%`}} /></div></td><td><RiskBadge risk={row.risk} /></td><td><Link className="row-action" href={`/threat/${row.id || 'paytm-support'}`}>View details <ChevronRight size={14} /></Link></td></tr>)}</tbody></table></div></div></Shell> }

function AppMonitoring() { const { rows, scan, busy, error, scanned } = useMonitor('app', appThreats); return <Shell title="App Monitoring" eyebrow="Monitoring / App stores"><div className="monitor-hero panel"><div><p className="eyebrow">APP SCAN</p><h2>Protect your customers from fake apps.</h2><p>Monitor app stores for unauthorized apps using your brand name or identity.</p></div><button className="button primary" onClick={scan} disabled={busy}><Smartphone size={17} /> {busy ? 'Scanning...' : 'Scan apps'}</button></div><div className="panel table-panel"><div className="panel-heading"><div><h2>Detected applications</h2><p>{rows.length} potential threats found in the last scan</p>{error && <p className="muted">{error}</p>}</div><span className="scan-time">{scanned ? 'Scanned just now' : 'Not scanned yet'}</span></div><div className="table-scroll"><table><thead><tr><th>App name</th><th>Developer</th><th>Name similarity</th><th>Risk</th><th /></tr></thead><tbody>{rows.map(row => <tr key={row.id || row.name}><td><Link className="table-link" href={`/threat/${row.id || 'wallet-plus'}`}>{row.name}</Link></td><td>{row.developer}</td><td><strong>{row.similarity || row.score}%</strong><div className="mini-progress"><i style={{width:`${row.similarity || row.score}%`}} /></div></td><td><RiskBadge risk={row.risk} /></td><td><Link className="row-action" href={`/threat/${row.id || 'wallet-plus'}`}>View details <ChevronRight size={14} /></Link></td></tr>)}</tbody></table></div></div></Shell> }

function ThreatDetails({ id: rawId }: { id: string }) { const id = decodeURIComponent(rawId); const [found, setFound] = useState<Row | null>(null); useEffect(() => { const local = findRemembered(id); if (local) { setFound(local); return } if (/^[a-f0-9]{24}$/i.test(id)) brandApi.threats(getBrandKey()).then(res => { const hit = (res.data?.data || []).map(threatDocToRow).find((r: Row) => r.id === id); if (hit) setFound(hit) }).catch(() => {}) }, [id]); const app = found ? isAppPlatform(found.platform) : (id === 'wallet-plus' || id === 'secure'); const threat: any = found || (app ? appThreats.find(t => t.id === id) || appThreats[0] : socialThreats.find(t => t.id === id) || socialThreats[0]); return <Shell title="Threat details" eyebrow="Threat intelligence / Investigation"><div className="detail-top"><Link href={app ? '/app-monitoring' : '/social-monitoring'} className="back-link">← Back to monitoring</Link><RiskBadge risk={threat.risk} /></div><div className="detail-grid"><div className="panel detail-card"><div className="detail-icon">{app ? <Smartphone size={24} /> : <Search size={24} />}</div><p className="eyebrow">{app ? 'SUSPICIOUS APPLICATION' : 'SOCIAL ACCOUNT'}</p><h2>{threat.name}</h2><div className="detail-meta"><span>{app ? 'Developer' : 'Platform'}</span><b>{app ? threat.developer : threat.platform}</b></div><div className="detail-meta"><span>{app ? 'Name similarity' : 'Similarity score'}</span><b>{threat.score || threat.similarity}%</b></div>{app && <div className="detail-meta"><span>Developer status</span><b className="danger-text">Not official</b></div>}</div><div className="panel reason-card"><p className="eyebrow">WHY THIS WAS FLAGGED</p><h2>Risk assessment</h2><div className="reason-box"><AlertTriangle size={19} /><p>{app ? `${threat.description} Developer is not associated with the official brand.` : threat.reason}</p></div><h3>Detection signals</h3><ul><li>Brand name similarity above monitoring threshold</li><li>{app ? 'Developer mismatch with official app registry' : 'Contains brand-related keywords'}</li><li>Source is not verified by BrandShield</li></ul></div></div></Shell> }

export default function Page() { const pathname = usePathname(); const router = useRouter(); if (pathname === '/brand-profile') return <BrandProfile />; if (pathname === '/social-monitoring') return <SocialMonitoring />; if (pathname === '/app-monitoring') return <AppMonitoring />; if (pathname.startsWith('/threat/')) return <ThreatDetails id={pathname.split('/').pop() || ''} />; return <Dashboard /> }

