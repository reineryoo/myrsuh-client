import { getDate, getDaysInMonth, isSameMonth } from 'date-fns'
import { dateKey, monthDays } from '@/lib/dates'
import { pairKinds, pairWord } from '@/lib/lessons'
import { cn } from '@/lib/utils'
import type { Day, Lesson } from '@/types'

export function LessonDots({ lessons }: { lessons: Lesson[] }) {
  return <span className="lesson-dots" aria-hidden="true">{pairKinds(lessons).slice(0, 8).map((kind, index) => <i className={kind} key={index} />)}</span>
}

export function MonthGrid({ month, today, days, selected, onSelect, compact = false, start, end }:
  { month: Date; today: string; days: Map<string, Day>; selected?: string; onSelect: (date: Date) => void; compact?: boolean; start?: string; end?: string }) {
  const allDays = monthDays(month)
  const offset = allDays.findIndex(day => isSameMonth(day, month))
  const visibleDays = allDays.slice(0, Math.ceil((offset + getDaysInMonth(month)) / 7) * 7)
  return <div className={cn('month-grid', compact && 'compact')}>
    {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map(day => <div className="weekday" key={day}>{day}</div>)}
    {visibleDays.map(date => {
      const key = dateKey(date)
      if (!isSameMonth(date, month)) return <span key={key} className="month-spacer" aria-hidden="true" />
      const lessons = days.get(key)?.lessons ?? []
      const count = new Set(lessons.map(lesson => lesson.pair)).size
      const unavailable = !start || !end || key < start || key > end
      return <button key={key} onClick={() => onSelect(date)}
        aria-label={`${key}${unavailable ? ', расписание недоступно' : `, ${count} ${pairWord(count)}`}`} aria-pressed={selected === key}
        className={cn('month-cell', today === key && 'is-today', selected === key && 'is-selected', unavailable && 'unavailable', !count && 'free-date')}>
        <span className="date-number">{getDate(date)}</span>
        {!unavailable && <LessonDots lessons={lessons} />}
        {today === key && <span className="today-marker" aria-hidden="true" />}
      </button>
    })}
  </div>
}
