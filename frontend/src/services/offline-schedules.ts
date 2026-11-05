import { GROUP_KEY, parseSavedGroups, readSetting, SAVED_GROUPS_KEY } from '@/lib/storage'
import type { Schedule } from '@/types'

const SCHEDULE_CACHE = 'myrsuh-schedules-v1'
const pendingUpdates = new Map<string, Promise<void>>()
const schedulePath = (groupId: string) => `/api/schedule?group_id=${encodeURIComponent(groupId)}`

export function isSavedSchedule(groupId: string) {
  return readSetting(GROUP_KEY) === groupId || parseSavedGroups(readSetting(SAVED_GROUPS_KEY)).includes(groupId)
}

// Serialize writes and deletion so an unfinished write cannot restore a removed group.
async function updateScheduleCache(groupId: string, update: (cache: Cache) => Promise<void>) {
  const previous = pendingUpdates.get(groupId) ?? Promise.resolve()
  const pending = previous.then(async () => update(await caches.open(SCHEDULE_CACHE)))
    .catch(() => { /* Viewing live data must work even when storage is unavailable. */ })
  pendingUpdates.set(groupId, pending)
  await pending
  if (pendingUpdates.get(groupId) === pending) pendingUpdates.delete(groupId)
}

export async function readOfflineSchedule(groupId: string): Promise<Schedule | null> {
  try {
    const saved = await (await caches.open(SCHEDULE_CACHE)).match(schedulePath(groupId))
    if (saved && isSavedSchedule(groupId)) return { ...await saved.json(), offline: true }
  } catch { /* The browser may clear storage or deny access to it. */ }
  return null
}

export function saveOfflineSchedule(groupId: string, data: Schedule) {
  return updateScheduleCache(groupId, async cache => {
    if (isSavedSchedule(groupId)) await cache.put(schedulePath(groupId), Response.json(data))
  })
}

export function forgetOfflineSchedule(groupId: string) {
  return updateScheduleCache(groupId, async cache => { await cache.delete(schedulePath(groupId)) })
}
