export class ApiError extends Error {
  constructor(message: string, public status: number, public retryAfter: number = 0) { super(message) }
}
export async function request<T>(url: string, method = 'GET'): Promise<T> {
  let response: Response
  try {
    if (!navigator.onLine) throw new Error('offline')
    response = await fetch(url, { method, cache: 'no-store', signal: AbortSignal.timeout(30000) })
  } catch {
    throw new ApiError('Нет связи с сервером расписания', 0)
  }
  if (!response.ok) {
    const body: unknown = await response.json().catch(() => null)
    const detail = body && typeof body === 'object' && 'detail' in body && typeof body.detail === 'string' ? body.detail : 'Не удалось загрузить расписание. Попробуйте ещё раз'
    throw new ApiError(detail, response.status, Number(response.headers.get('Retry-After') || 0))
  }
  return response.json() as Promise<T>
}
import { GROUP_KEY, OFFLINE_GROUPS_KEY, parseSavedGroups, readSetting, SAVED_GROUPS_KEY } from '@/lib/storage'
import type { Group, Schedule } from '@/types'

const SCHEDULE_CACHE = 'myrsuh-schedules-v1'


function canUseOfflineCopy(error: unknown) {
  return error instanceof ApiError && (error.status === 0 || error.status >= 500)
}

function isSavedSchedule(groupId: string) {
  return readSetting(GROUP_KEY) === groupId || parseSavedGroups(readSetting(SAVED_GROUPS_KEY)).includes(groupId)
}

export async function requestGroups(): Promise<{ items: Group[]; offline: boolean }> {
  try {
    return { items: await request<Group[]>('/api/groups'), offline: false }
  } catch (error) {
    if (!canUseOfflineCopy(error)) throw error
    const saved = readSetting(OFFLINE_GROUPS_KEY)
    if (!saved) throw error
    try {
      const items: unknown = JSON.parse(saved)
      if (!Array.isArray(items)) throw error
      return { items: items.filter(item => typeof item?.id === 'string' && isSavedSchedule(item.id)), offline: true }
    } catch {
      throw error
    }
  }
}

export async function requestSchedule(groupId: string, refresh = false): Promise<Schedule> {
  const query = `?group_id=${encodeURIComponent(groupId)}`
  const key = `/api/schedule${query}`
  let data: Schedule
  try {
    data = await request<Schedule>(refresh ? `/api/schedule/refresh${query}` : key, refresh ? 'POST' : 'GET')
  } catch (error) {
    if (refresh || !canUseOfflineCopy(error) || !isSavedSchedule(groupId)) throw error
    try {
      const saved = await (await caches.open(SCHEDULE_CACHE)).match(key)
      if (saved) return { ...await saved.json(), offline: true }
    } catch { /* Storage can be unavailable or cleared by the browser. */ }
    throw error
  }

  try {
    const cache = await caches.open(SCHEDULE_CACHE)
    if (isSavedSchedule(groupId)) {
      await cache.put(key, Response.json(data))
    }
  } catch { /* A storage failure must not prevent viewing the live schedule. */ }
  return data
}

export async function forgetOfflineSchedule(groupId: string) {
  try {
    const cache = await caches.open(SCHEDULE_CACHE)
    await cache.delete(`/api/schedule?group_id=${encodeURIComponent(groupId)}`)
  } catch { /* There may be no persistent storage on this device. */ }
}
