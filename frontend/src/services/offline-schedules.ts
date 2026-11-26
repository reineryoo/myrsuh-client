import { GROUP_KEY, parseSavedGroups, readSetting, readTeacherPreferences, SAVED_GROUPS_KEY } from '@/lib/storage'
import type { Schedule, ScheduleData, TeacherSchedule } from '@/types'

const SCHEDULE_CACHE = 'myrsuh-schedules-v1'
const pendingUpdates = new Map<string, Promise<void>>()
const schedulePath = (groupId: string) => `/api/schedule?group_id=${encodeURIComponent(groupId)}`
export const teacherSchedulePath = (teacherId: string) => `/api/teachers/${encodeURIComponent(teacherId)}/schedule`

function isTeacherSaved(teacherId: string) {
  return readTeacherPreferences().saved.some(teacher => teacher.id === teacherId)
}

export function isSavedSchedule(groupId: string) {
  return readSetting(GROUP_KEY) === groupId || parseSavedGroups(readSetting(SAVED_GROUPS_KEY)).includes(groupId)
}

// Serialize writes and deletion so an unfinished write cannot restore a removed group.
async function updateScheduleCache(path: string, update: (cache: Cache) => Promise<void>) {
  const previous = pendingUpdates.get(path) ?? Promise.resolve()
  const pending = previous.then(async () => update(await caches.open(SCHEDULE_CACHE)))
    .catch(() => { /* Viewing live data must work even when storage is unavailable. */ })
  pendingUpdates.set(path, pending)
  await pending
  if (pendingUpdates.get(path) === pending) pendingUpdates.delete(path)
}

async function readCachedSchedule<T extends ScheduleData>(path: string, isSaved: () => boolean): Promise<T | null> {
  try {
    const saved = await (await caches.open(SCHEDULE_CACHE)).match(path)
    if (saved && isSaved()) return { ...await saved.json(), offline: true }
  } catch { /* The browser may clear storage or deny access to it. */ }
  return null
}

function saveCachedSchedule(path: string, data: ScheduleData, isSaved: () => boolean) {
  return updateScheduleCache(path, async cache => {
    if (isSaved()) await cache.put(path, Response.json(data))
  })
}

function forgetCachedSchedule(path: string) {
  return updateScheduleCache(path, async cache => { await cache.delete(path) })
}

export function readOfflineSchedule(groupId: string) {
  return readCachedSchedule<Schedule>(schedulePath(groupId), () => isSavedSchedule(groupId))
}

export function saveOfflineSchedule(groupId: string, data: Schedule) {
  return saveCachedSchedule(schedulePath(groupId), data, () => isSavedSchedule(groupId))
}

export function forgetOfflineSchedule(groupId: string) {
  return forgetCachedSchedule(schedulePath(groupId))
}

export const readOfflineTeacherSchedule = (teacherId: string) =>
  readCachedSchedule<TeacherSchedule>(teacherSchedulePath(teacherId), () => isTeacherSaved(teacherId))
export const saveOfflineTeacherSchedule = (teacherId: string, data: TeacherSchedule) =>
  saveCachedSchedule(teacherSchedulePath(teacherId), data, () => isTeacherSaved(teacherId))
export const forgetOfflineTeacherSchedule = (teacherId: string) => forgetCachedSchedule(teacherSchedulePath(teacherId))
