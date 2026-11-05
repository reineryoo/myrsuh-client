import type { Lesson } from '@/types'

export type LessonKind = 'lecture' | 'practice' | 'combined' | 'exam' | 'neutral'
export const kindLabels: Record<LessonKind, string> = {
  lecture: 'Лекции', practice: 'Практика', combined: 'Лек. + сем.', exam: 'Экзамены', neutral: 'Другие',
}

export function lessonTypes(value: string | null) {
  return value?.split(/[;,]/).map(type => type.trim()).filter(Boolean) ?? []
}

export function lessonKind(value: string | null): LessonKind {
  const type = value?.toLocaleLowerCase('ru').replaceAll('.', '') ?? ''
  if (/экз|экзам|зач[её]т|^зач$/.test(type)) return 'exam'
  if (/лек/.test(type) && /сем/.test(type)) return 'combined'
  if (/сем|пр[ао]?к|^пр$|лаб/.test(type)) return 'practice'
  if (/лек/.test(type)) return 'lecture'
  return 'neutral'
}

export function typeLabel(value: string, short = false) {
  const type = value.toLocaleLowerCase('ru').replaceAll('.', '')
  if (/лек/.test(type)) return short ? 'ЛЕК' : 'Лекция'
  if (/сем/.test(type)) return short ? 'СЕМ' : 'Семинар'
  if (/лаб/.test(type)) return short ? 'ЛАБ' : 'Лабораторная'
  if (/пр[ао]?к|^пр$/.test(type)) return short ? 'ПРАК' : 'Практика'
  if (/экз/.test(type)) return short ? 'ЭКЗ' : 'Экзамен'
  if (/зач/.test(type)) return short ? 'ЗАЧ' : 'Зачёт'
  if (/конс/.test(type)) return short ? 'КОНС' : 'Консультация'
  return value
}

export function lessonBadges(value: string | null) {
  if (lessonKind(value) === 'combined') return [{ kind: 'combined' as const, label: 'ЛЕК · СЕМ', title: 'Лекция и семинар' }]
  return lessonTypes(value).map(type => ({ kind: lessonKind(type), label: typeLabel(type, true), title: typeLabel(type) }))
}

export function groupPairs(lessons: Lesson[]) {
  const pairs = new Map<number, Lesson[]>()
  for (const lesson of lessons) {
    const entries = pairs.get(lesson.pair) ?? []
    entries.push(lesson)
    pairs.set(lesson.pair, entries)
  }
  return [...pairs.entries()].sort(([a], [b]) => a - b)
}

export function pairKinds(lessons: Lesson[]) {
  const priority: Record<LessonKind, number> = { neutral: 0, lecture: 1, practice: 2, combined: 3, exam: 4 }
  return groupPairs(lessons).map(([, entries]) => entries.reduce<LessonKind>(
    (kind, lesson) => priority[lessonKind(lesson.lesson_type)] > priority[kind] ? lessonKind(lesson.lesson_type) : kind,
    'neutral',
  ))
}

export const pairWord = (count: number) => count % 10 === 1 && count % 100 !== 11 ? 'пара'
  : [2, 3, 4].includes(count % 10) && ![12, 13, 14].includes(count % 100) ? 'пары' : 'пар'

export function breakMinutes(end: string, start: string) {
  const minutes = (value: string) => Number(value.slice(0, 2)) * 60 + Number(value.slice(3))
  return Math.max(0, minutes(start) - minutes(end))
}

export function normalizeSubject(value: string) {
  return value.toLocaleLowerCase('ru').replaceAll('ё', 'е').trim().replace(/\s+/g, ' ')
}

export function matchesSearch(lesson: Lesson, query: string) {
  const text = normalizeSubject(lesson.subject)
  return normalizeSubject(query).split(' ').every(term => text.includes(term))
}
