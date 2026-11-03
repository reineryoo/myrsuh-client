import { groupShortName } from '@/config/groups'
import type { Group } from '@/types'

const normalize = (value: string) => value.toLocaleLowerCase('ru-RU').replaceAll('ё', 'е').replace(/\s+/g, ' ').trim()
export function findGroups(groups: Group[], query: string) {
  const words = normalize(query).split(' ').filter(Boolean)
  return groups.filter(group => {
    const text = normalize([groupShortName(group), group.direction, group.profile, group.institute, group.flow, group.label, group.education, `${group.course} курс`, `группа ${group.group}`].join(' '))
    return words.every(word => text.includes(word))
  })
}
