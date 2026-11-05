import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { GROUP_KEY, SAVED_GROUPS_KEY } from '@/lib/storage'

beforeEach(() => {
  vi.resetModules()
  vi.stubEnv('VITE_DATA_SOURCE', 'static')
  vi.stubEnv('BASE_URL', '/myrsuh-client/')
  vi.stubGlobal('navigator', { onLine: true })
  vi.stubGlobal('localStorage', { getItem: (key: string) => {
    if (key === GROUP_KEY) return '3:2:213_1'
    if (key === SAVED_GROUPS_KEY) return '["3:2:213_1"]'
    return null
  } })
  vi.stubGlobal('caches', { open: vi.fn(async () => ({ put: vi.fn(), match: vi.fn() })) })
  vi.stubGlobal('fetch', vi.fn(async () => Response.json({})))
})

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs() })

it('loads configuration, catalog and a schedule under the project path', async () => {
  const api = await import('./api')
  await api.requestConfig()
  await api.requestGroups()
  await api.requestSchedule('3:2:213_1')
  expect(vi.mocked(fetch).mock.calls.map(([url]) => url)).toEqual([
    '/myrsuh-client/data/config.json', '/myrsuh-client/data/groups.json',
    '/myrsuh-client/data/schedules/3_3A2_3A213_1.json',
  ])
  expect(vi.mocked(fetch).mock.calls.every(([, options]) => options?.method === 'GET')).toBe(true)
})

it('uses an existing saved copy when a static file temporarily returns 404', async () => {
  vi.mocked(fetch).mockResolvedValue(new Response('', { status: 404 }))
  const saved = { group_id: '3:2:213_1', days: [] }
  vi.stubGlobal('caches', { open: vi.fn(async () => ({ match: vi.fn(async () => Response.json(saved)) })) })
  const { requestSchedule } = await import('./api')
  expect(await requestSchedule('3:2:213_1')).toEqual({ ...saved, offline: true })
})
