import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { SubjectSearchResults } from './SubjectSearchResults'
import type { Lesson, Schedule } from '@/types'

const lesson: Lesson = {
  id: 'first', pair: 1, start: '09:00', end: '10:30', subject: 'Теория информации',
  lesson_type: 'лек', room: null, teacher: null, teacher_full: null,
  group: null, subgroup: null, source: {},
}
const data: Schedule = {
  group_id: 'test', period_start: '2026-11-04', period_end: '2026-11-06',
  days: [
    { date: '2026-11-04', lessons: [lesson] },
    { date: '2026-11-05', lessons: [{ ...lesson, id: 'current' }] },
    { date: '2026-11-06', lessons: [{ ...lesson, id: 'future' }] },
  ],
  bells: {}, academic_year: null, semester: null, university_updated_at: null,
  fetched_at: '2026-11-05T09:00:00+03:00', stale: false, warning: null,
}

describe('subject search result ordering', () => {
  it('shows current and upcoming classes first and mutes past classes under one heading', () => {
    const html = renderToStaticMarkup(<SubjectSearchResults data={data} query="информа" now={{ date: '2026-11-05', time: '09:30' }} onDay={() => {}} />)
    expect(html.indexOf('5 ноября, четверг')).toBeLessThan(html.indexOf('6 ноября, пятница'))
    expect(html.indexOf('6 ноября, пятница')).toBeLessThan(html.indexOf('4 ноября, среда'))
    expect(html.match(/past-lesson/g)).toHaveLength(1)
    expect(html.match(/Уже прошли/g)).toHaveLength(1)
  })

  it('respects the setting that keeps classes chronological and colored', () => {
    const html = renderToStaticMarkup(<SubjectSearchResults data={data} query="информа" now={{ date: '2026-11-05', time: '09:30' }} organizePast={false} onDay={() => {}} />)
    expect(html.indexOf('4 ноября, среда')).toBeLessThan(html.indexOf('5 ноября, четверг'))
    expect(html).not.toContain('past-lesson')
    expect(html).not.toContain('Уже прошли')
  })
})
