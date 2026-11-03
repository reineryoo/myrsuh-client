import { getDate } from 'date-fns'
import { dateKey, fmt, lessonProgress, moscowNow } from '@/lib/dates'
import { lessonBadges, lessonKind } from '@/lib/lessons'
import { cn } from '@/lib/utils'
import { LessonDots } from './MonthGrid'
import type { Day, Lesson, Schedule } from '@/types'

export function WeekGrid({ dates, days, schedule, selected, now, onDay, onLessons }:
  { dates: Date[]; days: Map<string, Day>; schedule: Pick<Schedule, 'bells' | 'period_start' | 'period_end'>; selected: string;
    now: ReturnType<typeof moscowNow>; onDay: (date: Date) => void; onLessons: (date: Date, lessons: Lesson[]) => void }) {
  return <div className="week-grid" aria-label="Расписание недели">
    <div className="week-corner" aria-hidden="true">МСК</div>
    {dates.map(date => {
      const key = dateKey(date)
      const lessons = days.get(key)?.lessons ?? []
      return <button className={cn('week-date', selected === key && 'is-selected', now.date === key && 'is-today', !lessons.length && 'free-date')}
        key={key} onClick={() => onDay(date)} aria-label={`Открыть ${fmt(date, 'd MMMM, EEEE')}`}>
        <span>{fmt(date, 'EEEEEE')}</span><strong>{getDate(date)}</strong><LessonDots lessons={lessons} />
      </button>
    })}
    {Object.entries(schedule.bells).map(([number, times]) => <div className="week-row" key={number}>
      <div className="week-time"><strong>{times[0]}</strong><span>{times[1]}</span></div>
      {dates.map(date => {
        const key = dateKey(date)
        const lessons = days.get(key)?.lessons.filter(lesson => lesson.pair === Number(number)) ?? []
        const unavailable = key < schedule.period_start || key > schedule.period_end
        return <div key={key} className={cn('week-slot', unavailable && 'unavailable')}>
          {lessons.map((lesson, index) => <button key={lesson.id} onClick={() => onLessons(date, lessons)}
            className={cn('week-event', lessonKind(lesson.lesson_type), lessonProgress(lesson, key, now) !== null && 'current-event')}
            aria-label={`${fmt(date, 'd MMMM')}, ${lesson.pair} пара, ${lesson.start}–${lesson.end}, ${lesson.subject}${lessons.length > 1 ? `, запись ${index + 1} из ${lessons.length}` : ''}`}>
            <span className="week-event-type">{lessonBadges(lesson.lesson_type).map(badge => badge.label).join('/') || 'ПАРА'}</span>
            <span className="week-event-room">{lesson.room ?? 'Без ауд.'}</span>
          </button>)}
          {!lessons.length && <span className="empty-slot" aria-label={unavailable ? 'Нет данных' : 'Без занятий'} />}
        </div>
      })}
    </div>)}
  </div>
}
