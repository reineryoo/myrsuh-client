export const GROUP_KEY = 'rggu-schedule:selected-group'
export const THEME_KEY = 'rggu-schedule:theme'
export const SAVED_GROUPS_KEY = 'rggu-schedule:saved-groups'
export const ACCENT_KEY = 'rggu-schedule:accent'
export const ORGANIZE_PAST_KEY = 'rggu-schedule:organize-past'
export const NICKNAME_KEY = 'rggu-schedule:nickname'
export const OFFLINE_GROUPS_KEY = 'rggu-schedule:offline-groups'

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
