import type { Day, Lesson } from '@/types'
import type { MoscowClock } from '@/lib/dates'
import { groupPairs, kindLabels, normalizeSubject, pairKinds } from '@/lib/lessons'
import type { LessonKind } from '@/lib/lessons'

export interface SubjectPair { date: string; lessons: Lesson[] }
export interface SubjectSummary { key: string; name: string; pairs: SubjectPair[] }

export function subjectIndex(days: Day[]): SubjectSummary[] {
  const subjects = new Map<string, SubjectSummary>()
  for (const day of days) {
    for (const [, lessons] of groupPairs(day.lessons)) {
      const pairSubjects = new Map<string, Lesson[]>()
      for (const lesson of lessons) {
        const key = normalizeSubject(lesson.subject)
        if (!key) continue
        const entries = pairSubjects.get(key) ?? []
        entries.push(lesson)
        pairSubjects.set(key, entries)
      }
      for (const [key, entries] of pairSubjects) {
        const subject = subjects.get(key) ?? { key, name: entries[0].subject.trim().replace(/\s+/g, ' '), pairs: [] }
        subject.pairs.push({ date: day.date, lessons: entries })
        subjects.set(key, subject)
      }
    }
  }
  for (const subject of subjects.values()) {
    subject.pairs.sort((a, b) => a.date.localeCompare(b.date) || a.lessons[0].start.localeCompare(b.lessons[0].start))
  }
  return [...subjects.values()].sort((a, b) => a.name.localeCompare(b.name, 'ru'))
}

export function isPastSubjectPair(pair: SubjectPair, now: MoscowClock) {
  return pair.date < now.date || pair.date === now.date && pair.lessons.every(lesson => lesson.end <= now.time)
}

export function remainingSubjectKinds(subject: SubjectSummary, now: MoscowClock) {
  const kinds = subject.pairs.filter(pair => !isPastSubjectPair(pair, now)).map(pair => pairKinds(pair.lessons)[0])
  return (Object.keys(kindLabels) as LessonKind[])
    .map(kind => ({ kind, count: kinds.filter(value => value === kind).length }))
    .filter(item => item.count > 0)
}

export function subjectProgress(subject: SubjectSummary, now: MoscowClock) {
  const completed = subject.pairs.filter(pair => isPastSubjectPair(pair, now)).length
  const current = subject.pairs.some(pair => pair.date === now.date
    && pair.lessons.some(lesson => lesson.start <= now.time && now.time < lesson.end))
  return { total: subject.pairs.length, completed, remaining: subject.pairs.length - completed, current }
}
