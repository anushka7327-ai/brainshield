import axios from 'axios'

// Requests use relative /api/... paths. next.config.mjs forwards them to the
// SentinelDRP server (default http://localhost:8000), so there is no CORS or port issue.
export default axios.create({
  baseURL: '/',
})

export const brandApi = {
  // Saves the brand form. Falls back to resolve + update when the database is off or the brand already exists.
  save: async (payload: Record<string, any>) => {
    try {
      return await axios.post('/api/brand', payload)
    } catch (err: any) {
      const status = err?.response?.status
      if (status !== 409 && status !== 503) throw err
    }
    const resolved = await axios.post('/api/brands/resolve', { name: payload.brandName, domain: payload.website || undefined, enrich: false })
    const key = resolved.data.brandKey
    return axios.patch(`/api/brands/${key}`, {
      ...(payload.officialHandles?.length ? { officialHandles: payload.officialHandles } : {}),
      officialDeveloper: payload.developerName || '',
    })
  },
  socialScan: (brandKey: string) => axios.post('/api/scan/run', { brandKey, type: 'social' }),
  appScan: (brandKey: string) => axios.post('/api/scan/run', { brandKey, type: 'apps' }),
  queue: (brandKey: string) => axios.get(`/api/threats/${brandKey}`),
  dashboard: (brandKey: string) => axios.get('/api/dashboard', { params: { brand: brandKey } }),
  threats: (brandKey: string) => axios.get('/api/threat', { params: { brand: brandKey } }),
}
