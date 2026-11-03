import { describe, expect, it } from 'vitest'
import { addDays, parseISO } from 'date-fns'
import { dateKey, lessonProgress, monthDays, monthsBetween, moscowNow, moveCalendarDate, semesterWeek, swipeDate, timeUntil, weekDays, weekStart } from './dates'
import type { Lesson } from '@/types'

describe('calendar boundaries', () => {
  it('uses Monday to Sunday across a year boundary', () => {
    expect(weekDays(parseISO('2027-01-01')).map(dateKey)).toEqual(['2026-12-28','2026-12-29','2026-12-30','2026-12-31','2027-01-01','2027-01-02','2027-01-03'])
    expect(dateKey(addDays(weekStart(parseISO('2026-12-31')), 7))).toBe('2027-01-04')
  })
  it('creates a complete Monday-first monthly grid', () => {
    const days = monthDays(parseISO('2026-11-02'))
    expect(days).toHaveLength(42)
    expect(dateKey(days[0])).toBe('2026-10-26')
    expect(dateKey(days[41])).toBe('2026-12-06')
  })
  it('includes all months of the returned semester', () => {
    expect(monthsBetween('2026-08-24','2027-03-21').map(dateKey)).toHaveLength(8)
  })
  it('swipes days across weeks and years, ignoring short gestures', () => {
    expect(dateKey(swipeDate('2026-12-31', 300, 100)!)).toBe('2027-01-01')
    expect(dateKey(swipeDate('2027-01-01', 100, 300)!)).toBe('2026-12-31')
    expect(swipeDate('2026-11-02', 100, 120)).toBeNull()
  })
  it('calculates the next lesson countdown', () => {
    expect(timeUntil('15:35', '14:20')).toBe('1 ч 15 мин')
    expect(timeUntil('15:35', '15:20')).toBe('15 мин')
  })
})
describe('Moscow time', () => {
  it('uses Moscow day at a UTC day boundary', () => {
    expect(moscowNow(new Date('2026-11-01T22:30:00Z'))).toEqual({date:'2026-11-02',time:'01:30',second:0})
  })
  it('detects progress only inside a real lesson', () => {
    const lesson = { start:'15:35',end:'16:55' } as Lesson
    expect(lessonProgress(lesson,'2026-11-02',{date:'2026-11-02',time:'16:15'})).toBe(.5)
    expect(lessonProgress(lesson,'2026-11-02',{date:'2026-11-02',time:'16:55'})).toBeNull()
    expect(lessonProgress(lesson,'2026-11-01',{date:'2026-11-02',time:'16:15'})).toBeNull()
  })
})

describe('semester progress and day navigation', () => {
  it('counts Monday-first weeks from the actual semester period', () => {
    expect(semesterWeek(parseISO('2026-11-03'),'2026-08-24','2027-03-21')).toEqual({current:11,total:30})
    expect(semesterWeek(parseISO('2026-08-24'),'2026-08-24','2027-03-21')?.current).toBe(1)
    expect(semesterWeek(parseISO('2027-03-21'),'2026-08-24','2027-03-21')?.current).toBe(30)
    expect(semesterWeek(parseISO('2027-03-22'),'2026-08-24','2027-03-21')).toBeNull()
  })
  it('moves a day across week and year boundaries, keeping week/month modes separate', () => {
    expect(dateKey(moveCalendarDate(parseISO('2026-11-08'),'day',1))).toBe('2026-11-09')
    expect(dateKey(moveCalendarDate(parseISO('2026-12-31'),'day',1))).toBe('2027-01-01')
    expect(dateKey(moveCalendarDate(parseISO('2027-01-01'),'day',-1))).toBe('2026-12-31')
    expect(dateKey(moveCalendarDate(parseISO('2026-11-03'),'week',1))).toBe('2026-11-10')
    expect(dateKey(moveCalendarDate(parseISO('2027-01-31'),'month',1))).toBe('2027-02-28')
  })
})
