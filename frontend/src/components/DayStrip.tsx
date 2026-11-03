import { getDate } from 'date-fns'
import { dateKey, fmt, weekDays } from '@/lib/dates'
import { cn } from '@/lib/utils'
import { LessonDots } from './MonthGrid'
import type { Day } from '@/types'

export function DayStrip({ date, today, days, onSelect }:
  { date: Date; today: string; days: Map<string, Day>; onSelect: (date: Date) => void }) {
  return <div className="day-strip" aria-label="Дни недели">{weekDays(date).map(item => {
    const key = dateKey(item)
    const lessons = days.get(key)?.lessons ?? []
    return <button key={key} aria-label={fmt(item, 'd MMMM, EEEE')} aria-pressed={key === dateKey(date)}
      onClick={() => onSelect(item)} className={cn(key === dateKey(date) && 'is-selected', !lessons.length && 'free-date', key === today && 'is-today')}>
      <span>{fmt(item, 'EEEEEE')}</span><strong>{getDate(item)}</strong><LessonDots lessons={lessons} />
    </button>
  })}</div>
}
