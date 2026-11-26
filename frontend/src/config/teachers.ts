import { staticDataEnabled } from './deployment'

export const legacyTeacher = { id: '197', name: 'Шукенбаева Наиля Шаукатовна' }

// Teacher schedules use the local API. Static hosting requires a teacher data export.
export const teacherSchedulesEnabled = !staticDataEnabled
