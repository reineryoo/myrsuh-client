import { UserRound } from 'lucide-react'
import { Dialog } from '@/components/ui/dialog'
import { groupShortName } from '@/config/groups'
import { fmt } from '@/lib/dates'
import { lessonBadges } from '@/lib/lessons'
import type { Group, Lesson } from '@/types'

function sourceValue(value: unknown) {
  if (typeof value !== 'string' && typeof value !== 'number') return ''
  const text = String(value).trim()
  return text === '-' || text === '—' ? '' : text
}

function studyGroup(lesson: Lesson, group?: Group) {
  const flow = sourceValue(lesson.source.flow)
  const course = sourceValue(lesson.source.course) || group?.course
  const programCode = (flow || group?.flow)?.match(/^\d+-[А-ЯЁ]+-[А-ЯЁ]+(?=\s|$)/iu)?.[0]
  const flowParts = flow.split('-').map(part => part.trim()).filter(Boolean)
  const name = flowParts.length > 3 ? flowParts.slice(-2).join(' ') : flow
  return {
    course: course ? [programCode, `${course} курс`].filter(Boolean).join(' ') : 'Не указан',
    name: name || (group ? groupShortName(group) : lesson.group) || 'Не указана',
  }
}

export function LessonDetailsDialog({ detail, group, onClose }:
  { detail: { date: Date; lessons: Lesson[] } | null; group?: Group; onClose: () => void }) {
  const lessons = detail?.lessons ?? []
  return <Dialog open={lessons.length > 0} onOpenChange={open => { if (!open) onClose() }}
    title={lessons.length === 1 ? lessons[0].subject : 'Занятия пары'}
    description={detail ? `${fmt(detail.date, 'EEEE, d MMMM')} · МСК` : 'Время московское'}>
    <div className="lesson-dialog">
      {lessons.map(lesson => {
        const study = studyGroup(lesson, group)
        const teacher = lesson.teacher_full || lesson.teacher
        const badges = lessonBadges(lesson.lesson_type)
        return <section className="lesson-detail" key={lesson.id}>
          {lessons.length > 1 && <h3>{lesson.subject}</h3>}
          {badges.length > 0 && <p className="lesson-detail-types">{badges.map((badge, index) => (
            <span className={`type-badge ${badge.kind}`} key={`${badge.title}:${index}`}>{badge.title}</span>
          ))}</p>}
          <dl className="lesson-detail-grid">
            <div className="lesson-detail-tile">
              <dt>Время</dt><dd>{lesson.start}–{lesson.end}<small>{lesson.pair}-я пара</small></dd>
            </div>
            <div className="lesson-detail-tile"><dt>Аудитория</dt><dd>{lesson.room || 'Не указана'}</dd></div>
            <div className="lesson-detail-tile lesson-detail-teacher">
              <dt><span className="lesson-detail-icon"><UserRound size={20} aria-hidden="true" /></span>Преподаватель</dt>
              <dd>{teacher || 'Не указан'}</dd>
            </div>
            <div className="lesson-detail-tile"><dt>Курс</dt><dd>{study.course}</dd></div>
            <div className="lesson-detail-tile">
              <dt>Группа</dt><dd>{study.name}{lesson.subgroup && <small>Подгруппа {lesson.subgroup}</small>}</dd>
            </div>
          </dl>
        </section>
      })}
    </div>
  </Dialog>
}
