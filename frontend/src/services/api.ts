import { OFFLINE_GROUPS_KEY, readSetting } from '@/lib/storage'
import type { Group, Schedule } from '@/types'
import { appPath, scheduleFilename, staticDataEnabled } from '@/config/deployment'
import { ApiError, request } from './http'
import { isSavedSchedule, readOfflineSchedule, saveOfflineSchedule } from './offline-schedules'
export { ApiError, request } from './http'
export { forgetOfflineSchedule } from './offline-schedules'

function canUseOfflineCopy(error: unknown) {
  return error instanceof ApiError && (error.status === 0 || error.status >= 500 || staticDataEnabled && error.status === 404)
}

export function requestConfig() {
  return request<{ manual_refresh: boolean }>(staticDataEnabled ? appPath('data/config.json') : '/api/config')
}

export async function requestGroups(): Promise<{ items: Group[]; offline: boolean }> {
  try {
    return { items: await request<Group[]>(staticDataEnabled ? appPath('data/groups.json') : '/api/groups'), offline: false }
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
    const url = staticDataEnabled ? appPath(`data/schedules/${scheduleFilename(groupId)}`)
      : refresh ? `/api/schedule/refresh${query}` : key
    data = await request<Schedule>(url, refresh && !staticDataEnabled ? 'POST' : 'GET')
  } catch (error) {
    if (refresh || !canUseOfflineCopy(error) || !isSavedSchedule(groupId)) throw error
    const saved = await readOfflineSchedule(groupId)
    if (saved) return saved
    throw error
  }
  await saveOfflineSchedule(groupId, data)
  return data
}
