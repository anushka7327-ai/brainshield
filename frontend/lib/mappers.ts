// Pure helpers that convert SentinelDRP backend responses into the row shapes
// the UI already renders. No imports, so they are easy to test on their own.

export type Risk = 'High' | 'Medium' | 'Low'

export type Row = {
  id: string
  name: string
  platform: string
  developer?: string
  similarity: number
  score: number
  risk: Risk
  reason?: string
  description?: string
  url?: string
}

// Same rule the backend uses to build a brand key from a brand name.
export const slugify = (s: string) =>
  String(s || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')

// Accounts for backend values: critical/high, medium, low/official and HIGH/MEDIUM/LOW.
export function toRisk(value: unknown): Risk {
  const v = String(value || '').toLowerCase()
  if (v === 'critical' || v === 'high') return 'High'
  if (v === 'medium') return 'Medium'
  return 'Low'
}

// A queue item as returned by POST /api/scan/run and GET /api/threats/:brandKey.
export function queueItemToRow(item: any): Row {
  const risk = item?.risk || {}
  const signals: string[] = Array.isArray(risk.signals) ? risk.signals.map((s: any) => s?.label).filter(Boolean) : []
  const similarity = Math.round(Number(risk.similarity ?? 0))
  const reason = signals.join('. ')
  return {
    id: String(item?.id ?? ''),
    name: String(item?.title || item?.identifier || 'Unknown'),
    platform: String(item?.platformLabel || item?.asset?.platform || ''),
    developer: item?.developer || '',
    similarity,
    score: Math.round(Number(risk.riskScore ?? similarity)),
    risk: toRisk(risk.severity),
    reason,
    description: reason,
    url: item?.url || '',
  }
}

// A saved Threat document from GET /api/threat.
export function threatDocToRow(t: any): Row {
  const similarity = Math.round(Number(t?.similarity ?? 0))
  return {
    id: String(t?._id ?? t?.id ?? ''),
    name: String(t?.name || 'Unknown'),
    platform: String(t?.platform || ''),
    developer: t?.developer || '',
    similarity,
    score: Math.round(Number(t?.riskScore || similarity)),
    risk: toRisk(t?.risk),
    reason: t?.reason || (Array.isArray(t?.reasons) ? t.reasons.join('. ') : ''),
    description: t?.reason || '',
    url: t?.url || '',
  }
}

export const isAppPlatform = (platform?: string) => platform === 'Play Store' || platform === 'App Store'

// Keeps flagged items first, highest score first, and drops items marked official.
export function sortRows(rows: Row[]): Row[] {
  return [...rows].sort((a, b) => b.score - a.score)
}

// "@paytm, facebook.com/paytm" style input -> trimmed list.
export const splitKeywords = (text: string) =>
  String(text || '').split(',').map(k => k.trim()).filter(Boolean)

// Same cleanup the backend applies to a social link or handle.
export function handleFrom(value: string): string {
  if (!value) return ''
  return String(value).trim().replace(/[?#].*$/, '').replace(/\/+$/, '').split('/').pop()!.replace(/^@/, '').toLowerCase()
}

// Turns the dashboard response into the arrays the charts expect.
export function dashboardToView(data: any) {
  return {
    totals: {
      total: Number(data?.totalThreats ?? 0),
      high: Number(data?.highRisk ?? 0),
      social: Number(data?.socialThreats ?? 0),
      apps: Number(data?.suspiciousApps ?? 0),
    },
    platformData: (data?.threatsByPlatform || []).map((p: any) => ({ name: p.platform, value: p.count })),
    levelData: (data?.threatLevels || []).map((l: any) => ({ name: l.level, value: l.count })),
  }
}

// Short-lived cache so the detail page can show a scan result that is not saved in the database.
const KEY = 'sentinel:last-rows'
export function rememberRows(rows: Row[]) {
  try {
    const old: Row[] = JSON.parse(sessionStorage.getItem(KEY) || '[]')
    const ids = new Set(rows.map(r => r.id))
    sessionStorage.setItem(KEY, JSON.stringify([...rows, ...old.filter(r => !ids.has(r.id))].slice(0, 300)))
  } catch {}
}
export function findRemembered(id: string): Row | undefined {
  try {
    return (JSON.parse(sessionStorage.getItem(KEY) || '[]') as Row[]).find(r => r.id === id)
  } catch {
    return undefined
  }
}

const BRAND_KEY = 'sentinel:brand'
export const DEFAULT_BRAND = 'Paytm'
export function getBrandName(): string {
  try { return localStorage.getItem(BRAND_KEY) || DEFAULT_BRAND } catch { return DEFAULT_BRAND }
}
export function setBrandName(name: string) {
  try { localStorage.setItem(BRAND_KEY, name) } catch {}
}

const FORM_KEY = 'sentinel:brand-form'
export function getBrandForm<T>(fallback: T): T {
  try { return { ...fallback, ...JSON.parse(localStorage.getItem(FORM_KEY) || '{}') } } catch { return fallback }
}
export function setBrandForm(form: unknown) {
  try { localStorage.setItem(FORM_KEY, JSON.stringify(form)) } catch {}
}
export const getBrandKey = () => slugify(getBrandName())
