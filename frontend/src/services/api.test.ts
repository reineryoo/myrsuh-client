import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { forgetOfflineSchedule, requestSchedule } from './api'
import { GROUP_KEY, SAVED_GROUPS_KEY } from '@/lib/storage'
import type { Schedule } from '@/types'

const schedule: Schedule = {
  group_id: '119_1', period_start: '2026-11-01', period_end: '2026-11-30',
  days: [], bells: {}, academic_year: null, semester: null,
  university_updated_at: null, fetched_at: '2026-11-05T10:00:00+03:00', stale: false, warning: null,
}

let settings: Map<string, string>
let copies: Map<string, Response>
let cache: { match: ReturnType<typeof vi.fn>; put: ReturnType<typeof vi.fn>; delete: ReturnType<typeof vi.fn> }

beforeEach(() => {
  settings = new Map([[GROUP_KEY, schedule.group_id], [SAVED_GROUPS_KEY, JSON.stringify([schedule.group_id])]])
  copies = new Map()
  cache = {
    match: vi.fn(async (key: string) => copies.get(key)?.clone()),
    put: vi.fn(async (key: string, response: Response) => { copies.set(key, response) }),
    delete: vi.fn(async (key: string) => copies.delete(key)),
  }
  vi.stubGlobal('localStorage', { getItem: (key: string) => settings.get(key) ?? null })
  vi.stubGlobal('navigator', { onLine: true })
  vi.stubGlobal('caches', { open: vi.fn(async () => cache) })
  vi.stubGlobal('fetch', vi.fn(async () => Response.json(schedule)))
})

afterEach(() => vi.unstubAllGlobals())

describe('offline schedule requests', () => {
  it('uses the saved schedule when a successful server response contains invalid JSON', async () => {
    await requestSchedule(schedule.group_id)
    vi.mocked(fetch).mockResolvedValue(new Response('<html>Service unavailable</html>', { status: 200 }))
    expect(await requestSchedule(schedule.group_id)).toEqual({ ...schedule, offline: true })
  })

  it('removes a group even when saving its previous response is still in progress', async () => {
    let releaseWrite!: () => void
    let markStarted!: () => void
    const started = new Promise<void>(resolve => { markStarted = resolve })
    const pendingWrite = new Promise<void>(resolve => { releaseWrite = resolve })
    cache.put.mockImplementation(async (key: string, response: Response) => {
      markStarted()
      await pendingWrite
      copies.set(key, response)
    })
    const pendingRequest = requestSchedule(schedule.group_id)
    await started
    settings.clear()
    const deletion = forgetOfflineSchedule(schedule.group_id)
    // Allow deletion to overlap the pending cache write.
    await new Promise(resolve => setTimeout(resolve, 0))
    releaseWrite()
    await Promise.all([pendingRequest, deletion])
    expect(copies.size).toBe(0)
  })

  it('does not save a response for a group removed while the network request was pending', async () => {
    let resolveRequest!: (response: Response) => void
    vi.mocked(fetch).mockImplementation(() => new Promise(resolve => { resolveRequest = resolve }))
    const pending = requestSchedule(schedule.group_id)
    settings.clear()
    await forgetOfflineSchedule(schedule.group_id)
    resolveRequest(Response.json(schedule))
    await pending
    expect(copies.size).toBe(0)
  })

  it('loads only saved groups offline and leaves live viewing usable when storage fails', async () => {
    await requestSchedule(schedule.group_id)
    vi.stubGlobal('navigator', { onLine: false })
    expect((await requestSchedule(schedule.group_id)).offline).toBe(true)
    settings.clear()
    await expect(requestSchedule(schedule.group_id)).rejects.toMatchObject({ status: 0 })
    vi.stubGlobal('navigator', { onLine: true })
    vi.stubGlobal('caches', { open: vi.fn().mockRejectedValue(new Error('Storage blocked')) })
    expect(await requestSchedule(schedule.group_id)).toEqual(schedule)
  })
})
