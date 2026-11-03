import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { parseISO } from 'date-fns'
import { DaySchedule } from './DaySchedule'
import { MonthGrid } from './MonthGrid'
import { WeekGrid } from './WeekGrid'
import { weekDays } from '@/lib/dates'
import type { Day, Lesson, Schedule } from '@/types'

const entries: Lesson[] = [
  { id: 'first', pair: 5, start: '15:35', end: '16:55', subject: 'Дисциплина А', lesson_type: 'лек', room: null, teacher: null, teacher_full: null, group: null, subgroup: null, source: {} },
  { id: 'parallel', pair: 5, start: '15:35', end: '16:55', subject: 'Дисциплина Б', lesson_type: 'экз', room: '114', teacher: null, teacher_full: null, group: null, subgroup: '2', source: {} },
  { id: 'second', pair: 6, start: '17:05', end: '18:25', subject: 'Дисциплина А', lesson_type: 'сем', room: null, teacher: 'Преподаватель', teacher_full: null, group: null, subgroup: null, source: {} },
]
const now = { date: '2026-11-02', time: '16:00' }
const days = new Map<string, Day>([['2026-11-02', { date: '2026-11-02', lessons: entries }]])

describe('calendar rendering with simultaneous lessons', () => {
  it('shows every flow and only the real break between different pairs', () => {
    const html = renderToStaticMarkup(<DaySchedule day="2026-11-02" lessons={entries} now={now} available />)
    expect(html.match(/<article/g)).toHaveLength(3)
    expect(html).toContain('Дисциплина Б')
    expect(html).toContain('перерыв 10 мин')
    expect(html.match(/class="lesson-break"/g)).toHaveLength(1)
    expect(html).toContain('Преподаватель не указан')
    expect(html).toContain('Аудитория не указана')
    expect(html).toContain('16:55')
    expect(html).toContain('Подгруппа 2')
    expect(html).toContain('Сейчас идёт')
    expect(html.match(/ещё 55 мин/g)).toHaveLength(2)
    expect(html.match(/role="progressbar"/g)).toHaveLength(2)
  })
  it('distinguishes unavailable dates from genuine free days', () => {
    const unavailable = renderToStaticMarkup(<DaySchedule day="2026-11-03" lessons={[]} now={now} available={false} />)
    const free = renderToStaticMarkup(<DaySchedule day="2026-11-03" lessons={[]} now={now} available />)
    expect(unavailable).toContain('На эту дату нет данных')
    expect(unavailable).not.toContain('занятий нет')
    expect(free).toContain('В этот день занятий нет')
  })
  it('keeps all seven week days and all flows in the compact week grid', () => {
    const schedule = { bells: { '5': ['15:35','16:55'], '6': ['17:05','18:25'] }, period_start: '2026-11-02', period_end: '2026-11-08' } satisfies Pick<Schedule, 'bells' | 'period_start' | 'period_end'>
    const html = renderToStaticMarkup(<WeekGrid dates={weekDays(parseISO(now.date))} days={days} schedule={schedule} now={now} selected={now.date} onDay={() => {}} onLessons={() => {}} />)
    expect(html.match(/aria-label="Открыть /g)).toHaveLength(7)
    expect(html.match(/class="week-event /g)).toHaveLength(3)
    expect(html).toContain('Дисциплина Б')
    expect(html).toContain('15:35–16:55')
  })
  it('makes the selected day and actual pair count accessible in the month', () => {
    const html = renderToStaticMarkup(<MonthGrid month={parseISO(now.date)} today={now.date} selected={now.date} days={days} onSelect={() => {}} start="2026-11-02" end="2026-11-30" />)
    expect(html).toContain('aria-label="2026-11-02, 2 пары" aria-pressed="true"')
    expect(html).toContain('2026-11-01, расписание недоступно')
    expect(html).not.toContain('2026-10-31')
  })
  it('can turn off both past-card muting and active-first reordering', () => {
    const later = { date:'2026-11-02',time:'17:10' }
    const organized = renderToStaticMarkup(<DaySchedule day={later.date} lessons={entries} now={later} available />)
    const chronological = renderToStaticMarkup(<DaySchedule day={later.date} lessons={entries} now={later} available organizePast={false} />)
    expect(organized).toContain('past-lesson')
    expect(organized.indexOf('17:05')).toBeLessThan(organized.indexOf('15:35'))
    expect(chronological).not.toContain('past-lesson')
    expect(chronological.indexOf('15:35')).toBeLessThan(chronological.indexOf('17:05'))
    expect(chronological.match(/<article/g)).toHaveLength(3)
  })
})
