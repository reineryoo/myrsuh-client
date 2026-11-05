import { describe, expect, it } from 'vitest'
import { remainingSubjectKinds, subjectIndex, subjectProgress } from './subjects'
import type { Day, Lesson } from '@/types'

const lesson: Lesson = {
  id: 'a', pair: 1, start: '09:00', end: '10:30', subject: 'Учёт данных',
  lesson_type: 'лек; сем', room: null, teacher: null, teacher_full: null,
  group: null, subgroup: null, source: {},
}
const days: Day[] = [
  { date: '2026-11-06', lessons: [{ ...lesson, id: 'future' }] },
  { date: '2026-11-05', lessons: [lesson, { ...lesson, id: 'parallel', subject: ' УЧЕТ   ДАННЫХ ', subgroup: '2' }] },
  { date: '2026-11-04', lessons: [
    { ...lesson, id: 'past', lesson_type: 'лек' },
    { ...lesson, id: 'seminar', pair: 2, start: '10:40', end: '12:10', lesson_type: 'сем' },
    { ...lesson, id: 'different', subject: 'Учёт данных в экономике' },
  ] },
]

describe('subject search progress', () => {
  it('merges spelling variants and parallel subgroups while preserving every result', () => {
    const subjects = subjectIndex(days)
    expect(subjects).toHaveLength(2)
    const subject = subjects.find(item => item.key === 'учет данных')!
    expect(subject.pairs).toHaveLength(4)
    expect(subject.pairs.map(pair => pair.date)).toEqual(['2026-11-04', '2026-11-04', '2026-11-05', '2026-11-06'])
    expect(subject.pairs[2].lessons.map(item => item.id)).toEqual(['a', 'parallel'])
    expect(subjectProgress(subject, { date: '2026-11-05', time: '09:30' }))
      .toEqual({ total: 4, completed: 2, remaining: 2, current: true })
  })

  it('counts a pair only at its end and uses the supplied Moscow date and time', () => {
    const subject = subjectIndex([{ date: '2026-11-05', lessons: [lesson] }])[0]
    expect(subjectProgress(subject, { date: '2026-11-05', time: '08:59' }).current).toBe(false)
    expect(subjectProgress(subject, { date: '2026-11-05', time: '09:00' }).current).toBe(true)
    expect(subjectProgress(subject, { date: '2026-11-05', time: '10:29' }).completed).toBe(0)
    expect(subjectProgress(subject, { date: '2026-11-05', time: '10:30' }))
      .toEqual({ total: 1, completed: 1, remaining: 0, current: false })
    expect(subjectProgress(subject, { date: '2026-11-06', time: '00:00' }).completed).toBe(1)
    expect(subjectProgress(subject, { date: '2026-11-04', time: '23:59' }).completed).toBe(0)
  })

  it('waits for every simultaneous entry to end', () => {
    const subject = subjectIndex([{ date: '2026-11-05', lessons: [lesson, { ...lesson, id: 'late', end: '10:40' }] }])[0]
    expect(subjectProgress(subject, { date: '2026-11-05', time: '10:30' }))
      .toEqual({ total: 1, completed: 0, remaining: 1, current: true })
  })

  it('counts remaining types once per pair, including the current class', () => {
    const subject = subjectIndex([
      { date: '2026-11-04', lessons: [{ ...lesson, lesson_type: 'сем' }] },
      { date: '2026-11-05', lessons: [lesson, { ...lesson, id: 'parallel', subgroup: '2' }] },
      { date: '2026-11-06', lessons: [
        { ...lesson, id: 'lecture', lesson_type: 'лек' },
        { ...lesson, id: 'practice', pair: 2, lesson_type: 'сем' },
        { ...lesson, id: 'exam', pair: 3, lesson_type: 'экз' },
      ] },
    ])[0]
    const now = { date: '2026-11-05', time: '09:30' }
    const kinds = remainingSubjectKinds(subject, now)
    expect(kinds).toEqual([
      { kind: 'lecture', count: 1 }, { kind: 'practice', count: 1 },
      { kind: 'combined', count: 1 }, { kind: 'exam', count: 1 },
    ])
    expect(kinds.reduce((sum, item) => sum + item.count, 0)).toBe(subjectProgress(subject, now).remaining)
    expect(remainingSubjectKinds(subject, { date: '2026-11-07', time: '00:00' })).toEqual([])
  })

  it('keeps groups isolated and handles empty schedules', () => {
    expect(subjectIndex([])).toEqual([])
    expect(subjectIndex([{ date: '2026-11-05', lessons: [] }])).toEqual([])
    expect(subjectIndex([{ date: '2026-11-05', lessons: [lesson] }])[0].pairs).toHaveLength(1)
    expect(days[0].date).toBe('2026-11-06')
  })
})
