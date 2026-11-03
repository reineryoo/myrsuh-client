import { describe, expect, it } from 'vitest'
import { findGroups } from './groups'
import type { Group } from '@/types'

const groups: Group[] = [{ id:'119_1', university:'РГГУ', institute:'ИИНТБ', direction:'Прикладная информатика', profile:'Программная инженерия', course:2, group:'1', education:'Очная', flow:'ИИНиТБ-ФИСБ-ПИ-ПИИ' }, { id:'other', university:'РГГУ', institute:'Институт', direction:'История', profile:'Музеи', course:1, group:'3', education:'Очная', flow:'100' }]
describe('registered group search', () => {
  it('finds the actual short name and direction without requiring exact case', () => {
    expect(findGroups(groups, '  пи ')).toEqual([groups[0]])
    expect(findGroups(groups, 'ПИ ПИИ')).toEqual([groups[0]])
    expect(findGroups(groups, 'прикладная')).toEqual([groups[0]])
  })
  it('supports additional groups and returns no invented results', () => {
    expect(findGroups(groups, 'ИСТОРИЯ')).toEqual([groups[1]])
    expect(findGroups(groups, 'неизвестная')).toEqual([])
    expect(findGroups(groups, '')).toEqual(groups)
    expect(findGroups([], 'ПИ')).toEqual([])
  })
})
