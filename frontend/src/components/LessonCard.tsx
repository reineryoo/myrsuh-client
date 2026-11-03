import { BookOpen, MapPin, Pencil, UserRound } from 'lucide-react'
import type { Lesson } from '@/types'
import { lessonProgress, moscowNow, timeUntil } from '@/lib/dates'
import { lessonBadges, lessonKind } from '@/lib/lessons'
import { cn } from '@/lib/utils'

export function LessonCard({ lesson, day, now, nextPair, mutePast = false }:
  { lesson: Lesson; day: string; now: ReturnType<typeof moscowNow>; nextPair?: number; mutePast?: boolean }) {
  const badges = lessonBadges(lesson.lesson_type)
  const progress = lessonProgress(lesson, day, now)
  const past = day < now.date || day === now.date && lesson.end <= now.time
  const next = day === now.date && lesson.pair === nextPair && progress === null
  return <article className={cn('lesson-card', lessonKind(lesson.lesson_type), mutePast && past && 'past-lesson', progress !== null && 'current-lesson')}>
    <div className="lesson-time"><strong>{lesson.start}</strong><span>{lesson.end}</span><span className="pair-number">{lesson.pair} пара</span></div>
    <div className="lesson-content">
      <h3>{lesson.subject}</h3>
      <div className="lesson-meta">
        {badges.map((badge, index) => <span key={index} className={cn('type-badge', badge.kind)} title={badge.title}>
          {badge.kind === 'lecture' ? <BookOpen size={12} /> : <Pencil size={12} />}{badge.label}
        </span>)}
        {!badges.length && <span className="type-badge neutral">Тип не указан</span>}
        <span className="lesson-room"><MapPin size={14} />{lesson.room ?? 'Аудитория не указана'}</span>
      </div>
      <div className="lesson-teacher"><UserRound size={14} /><span>{lesson.teacher_full ?? lesson.teacher ?? 'Преподаватель не указан'}</span></div>
      {(lesson.group || lesson.subgroup) && <p className="subgroup">{[lesson.group && `Группа ${lesson.group}`, lesson.subgroup && `Подгруппа ${lesson.subgroup}`].filter(Boolean).join(' · ')}</p>}
      {(progress !== null || next || past) && <span className={cn('lesson-status', progress !== null && 'live')}>
        {progress !== null ? <><i className="live-dot" aria-hidden="true" />Сейчас идёт<span className="lesson-time-left">· ещё {timeUntil(lesson.end, now.time)}</span></> : next ? '· следующая' : 'Прошла'}
      </span>}
    </div>
    {progress !== null && <div className="lesson-progress" role="progressbar" aria-label="Прогресс текущей пары" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.floor(progress * 100)} aria-valuetext={`До конца ${timeUntil(lesson.end, now.time)}`}><span style={{ width: `${progress * 100}%` }} /></div>}
  </article>
}
