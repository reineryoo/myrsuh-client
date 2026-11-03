import { Fragment, useLayoutEffect, useRef, useState } from 'react'
import { CalendarRange, Coffee } from 'lucide-react'
import { LessonCard } from './LessonCard'
import { breakMinutes } from '@/lib/lessons'
import { moscowNow } from '@/lib/dates'
import { orderedDayPairs, timelinePosition } from '@/lib/day-state'
import type { Lesson } from '@/types'

export function DaySchedule({ day, lessons, now, available, organizePast = true }:
  { day: string; lessons: Lesson[]; now: ReturnType<typeof moscowNow>; available: boolean; organizePast?: boolean }) {
  const container = useRef<HTMLDivElement>(null)
  const elements = useRef(new Map<number, HTMLDivElement>())
  const [lineY, setLineY] = useState<number | null>(null)
  const pairs = orderedDayPairs(lessons, day, now, organizePast)
  const isPast = (lesson: Lesson) => day < now.date || day === now.date && lesson.end <= now.time
  const nextPair = day === now.date ? lessons.find(lesson => lesson.start > now.time)?.pair : undefined

  useLayoutEffect(() => {
    if (!container.current || day !== now.date || !available) { setLineY(null); return }
    const measure = () => {
      const origin = container.current?.getBoundingClientRect().top ?? 0
      const slots = pairs.filter(([, entries]) => !organizePast || !isPast(entries[0])).flatMap(([pair, entries]) => {
        const element = elements.current.get(pair)
        return element ? [{ start: entries[0].start, end: entries[0].end,
          top: element.getBoundingClientRect().top - origin, height: element.offsetHeight }] : []
      })
      setLineY(timelinePosition(slots, now))
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(container.current)
    return () => observer.disconnect()
  }, [day, lessons, now.date, now.time, now.second, available, organizePast])

  if (!available) return <div className="state-panel"><CalendarRange size={30} /><h3>На эту дату нет данных</h3><p>Университет пока не предоставил расписание на этот период.</p></div>
  if (!lessons.length) return <div className="state-panel free-day"><Coffee size={32} /><h3>В этот день занятий нет</h3><p>Можно выдохнуть и заняться своими планами.</p></div>
  return <div className="day-schedule" ref={container}>
    {day === now.date && lineY !== null && <div className="now-line dynamic-now-line" style={{ top: lineY }} aria-label={`Московское время ${now.time}`}><span>{now.time}</span><i /></div>}
    {pairs.map(([pair, entries], index) => {
      const previous = pairs[index - 1]?.[1][0]
      const startsPastSection = organizePast && isPast(entries[0]) && (!previous || !isPast(previous))
      const gap = previous && !startsPastSection ? breakMinutes(previous.end, entries[0].start) : 0
      return <Fragment key={pair}>
        {startsPastSection && <p className="past-section-heading">Уже прошли</p>}
        {gap > 0 && <div className="lesson-break"><span />перерыв {gap} мин<span /></div>}
        <div className="pair-group" ref={element => { if (element) elements.current.set(pair, element); else elements.current.delete(pair) }}>
          {entries.length > 1 && <p className="simultaneous-label">Занятий одновременно: {entries.length}</p>}
          {entries.map(lesson => <LessonCard key={lesson.id} lesson={lesson} day={day} now={now} nextPair={nextPair} mutePast={organizePast} />)}
        </div>
      </Fragment>
    })}
  </div>
}
