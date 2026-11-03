import { addDays, addMonths, differenceInCalendarWeeks, format, parseISO, startOfMonth, startOfWeek } from 'date-fns'
import { ru } from 'date-fns/locale'
import type { Lesson } from '@/types'

export const dateKey = (date: Date) => format(date, 'yyyy-MM-dd')
export const fmt = (date: Date, pattern: string) => format(date, pattern, { locale: ru })
export const weekStart = (date: Date) => startOfWeek(date, { weekStartsOn: 1 })
export const weekDays = (date: Date) => Array.from({ length: 7 }, (_, i) => addDays(weekStart(date), i))
export const monthDays = (date: Date) => Array.from({ length: 42 }, (_, i) => addDays(weekStart(startOfMonth(date)), i))
export function semesterWeek(date: Date, periodStart: string, periodEnd: string) {
  const key = dateKey(date)
  if (key < periodStart || key > periodEnd) return null
  const start = parseISO(periodStart)
  const options = { weekStartsOn: 1 as const }
  return {
    current: differenceInCalendarWeeks(date, start, options) + 1,
    total: differenceInCalendarWeeks(parseISO(periodEnd), start, options) + 1,
  }
}
export function moveCalendarDate(date: Date, view: 'day' | 'week' | 'month', direction: number) {
  return view === 'month' ? addMonths(date, direction) : addDays(date, direction * (view === 'day' ? 1 : 7))
}
export const monthsBetween = (start: string, end: string) => {
  const months: Date[] = []
  for (let month = startOfMonth(parseISO(start)); month <= parseISO(end); month = addMonths(month, 1)) months.push(month)
  return months
}
export interface MoscowClock { date: string; time: string; second?: number }
export function moscowNow(instant = new Date()): MoscowClock {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Moscow', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  }).formatToParts(instant)
  const get = (type: string) => parts.find(part => part.type === type)?.value ?? ''
  return { date: `${get('year')}-${get('month')}-${get('day')}`, time: `${get('hour')}:${get('minute')}`, second: Number(get('second')) }
}
export function lessonProgress(lesson: Lesson, day: string, now = moscowNow()) {
  if (day !== now.date || now.time < lesson.start || now.time >= lesson.end) return null
  const minutes = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3))
  return (minutes(now.time) + (now.second ?? 0) / 60 - minutes(lesson.start)) / (minutes(lesson.end) - minutes(lesson.start))
}
export function swipeDate(current: string, startX: number | null, endX: number) {
  return startX === null || Math.abs(endX - startX) < 50 ? null : addDays(parseISO(current), endX < startX ? 1 : -1)
}
export function timeUntil(start: string, current: string) {
  const minutes = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3))
  const delta = Math.max(0, minutes(start) - minutes(current))
  return delta >= 60 ? `${Math.floor(delta / 60)} ч${delta % 60 ? ` ${delta % 60} мин` : ''}` : `${delta} мин`
}
export const formatTimestamp = (value: string | null) => value ? new Intl.DateTimeFormat('ru-RU', {
  timeZone: 'Europe/Moscow', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
}).format(new Date(value)) : 'Нет сведений'
