import type { Group } from '@/types'

export function groupShortName(group?: Group) {
  if (!group) return 'Расписание'
  return group.flow.split('-').slice(-2).join(' ').trim() || group.direction
}
