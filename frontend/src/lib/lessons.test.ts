import { describe, expect, it } from 'vitest'
import { breakMinutes, groupPairs, lessonBadges, lessonKind, matchesSearch, pairKinds, pairWord } from './lessons'
import type { Lesson } from '@/types'

const lesson = (id: string, pair: number, type: string | null): Lesson => ({
  id, pair, start: '15:35', end: '16:55', lesson_type: type, subject: 'Теория информации',
  room: '114(кир)', teacher: 'Колыбанов К.Ю.', teacher_full: 'Колыбанов Кирилл Юрьевич',
  group: null, subgroup: null, source: {},
})

describe('lesson types and pair indicators', () => {
  it('reserves purple for assessments, not seminars', () => {
    expect(lessonKind('лек')).toBe('lecture')
    expect(lessonKind('сем')).toBe('practice')
    expect(lessonKind('лек; сем')).toBe('combined')
    expect(lessonKind('прак')).toBe('practice')
    expect(lessonKind('Экзамен')).toBe('exam')
    expect(lessonKind('экз.')).toBe('exam')
    expect(lessonKind(null)).toBe('neutral')
  })
  it('combines lecture/seminar into one badge with a distinct color', () => {
    expect(lessonBadges('лек; сем')).toEqual([{kind:'combined',label:'ЛЕК · СЕМ',title:'Лекция и семинар'}])
    expect(pairKinds([lesson('a', 1, 'лек; сем')])).toEqual(['combined'])
  })
  it('preserves parallel flows, with one calendar dot per pair', () => {
    const entries = [lesson('a', 6, 'лек'), lesson('b', 5, 'лек'), lesson('c', 5, 'сем')]
    const pairs = groupPairs(entries)
    expect(pairs.map(([pair]) => pair)).toEqual([5, 6])
    expect(pairs[0][1].map(item => item.id)).toEqual(['b', 'c'])
    expect(pairKinds(entries)).toEqual(['practice', 'lecture'])
    expect(entries.map(item => item.id)).toEqual(['a', 'b', 'c'])
  })
  it('prioritizes an exam when simultaneous entries have mixed types', () => {
    expect(pairKinds([lesson('a', 1, 'лек'), lesson('b', 1, 'экз')])).toEqual(['exam'])
  })
  it('calculates actual breaks without negative or parallel gaps', () => {
    expect(breakMinutes('16:55', '17:05')).toBe(10)
    expect(breakMinutes('11:35', '15:35')).toBe(240)
    expect(breakMinutes('16:55', '15:35')).toBe(0)
  })
  it('handles Russian plural forms for larger periods', () => {
    expect([1, 2, 5, 11, 21, 22].map(pairWord)).toEqual(['пара', 'пары', 'пар', 'пар', 'пара', 'пары'])
  })
})

describe('semester search', () => {
  it('matches words across fields without case or ё differences', () => {
    expect(matchesSearch(lesson('a', 5, 'лек'), 'колыбанов 114')).toBe(false)
    expect(matchesSearch({ ...lesson('a', 5, 'лек'), subject: 'Учёт данных' }, 'УЧЕТ')).toBe(true)
    expect(matchesSearch(lesson('a', 5, 'лек'), 'физика')).toBe(false)
    expect(matchesSearch({ ...lesson('a', 5, null), teacher: null, teacher_full: null, room: null }, 'теория')).toBe(true)
  })
})
