import { legacyTeacher } from '@/config/teachers'
import type { Teacher } from '@/types'

export const GROUP_KEY = 'rggu-schedule:selected-group'
export const THEME_KEY = 'rggu-schedule:theme'
export const SAVED_GROUPS_KEY = 'rggu-schedule:saved-groups'
export const ACCENT_KEY = 'rggu-schedule:accent'
export const ORGANIZE_PAST_KEY = 'rggu-schedule:organize-past'
export const NICKNAME_KEY = 'rggu-schedule:nickname'
export const OFFLINE_GROUPS_KEY = 'rggu-schedule:offline-groups'
export const TEACHER_SCHEDULE_KEY = 'rggu-schedule:teacher-schedule'
export const READ_UPDATES_KEY = 'rggu-schedule:read-updates'

export interface TeacherPreferences { saved: Teacher[]; selectedId: string | null }

function isTeacher(value: unknown): value is Teacher {
  return typeof value === 'object' && value !== null && 'id' in value && 'name' in value
    && typeof value.id === 'string' && /^\d+$/.test(value.id) && typeof value.name === 'string' && !!value.name.trim()
}

export function readTeacherPreferences(): TeacherPreferences {
  const raw = readSetting(TEACHER_SCHEDULE_KEY)
  // The single-teacher pilot stored just its selection state.
  if (raw === 'saved' || raw === 'selected') {
    return { saved: [legacyTeacher], selectedId: raw === 'selected' ? legacyTeacher.id : null }
  }
  try {
    const data: unknown = JSON.parse(raw ?? 'null')
    if (data && typeof data === 'object' && 'saved' in data && Array.isArray(data.saved)) {
      const saved = [...new Map(data.saved.filter(isTeacher).map(teacher => [teacher.id, teacher])).values()]
      const selectedId = 'selectedId' in data && typeof data.selectedId === 'string' ? data.selectedId : null
      return { saved, selectedId: saved.some(teacher => teacher.id === selectedId) ? selectedId : null }
    }
  } catch { /* Ignore damaged browser preferences. */ }
  return { saved: [], selectedId: null }
}

export function parseSavedGroups(value: string | null): string[] {
  try {
    const parsed: unknown = JSON.parse(value ?? '[]')
    return Array.isArray(parsed) ? [...new Set(parsed.filter((id): id is string => typeof id === 'string' && id.length > 0))] : []
  } catch { return [] }
}
export function readSetting(key: string) {
  try { return localStorage.getItem(key) } catch { return null }
}
export function saveSetting(key: string, value: string | null) {
  try { if (value === null) localStorage.removeItem(key); else localStorage.setItem(key, value) } catch { /* Settings stay available in memory in private browsers. */ }
}
