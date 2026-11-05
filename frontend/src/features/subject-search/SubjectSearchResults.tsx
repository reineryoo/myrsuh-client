import { useMemo, useState } from 'react'
import { ArrowRight, ChevronLeft, Search } from 'lucide-react'
import { parseISO } from 'date-fns'
import { Button } from '@/components/ui/button'
import { LessonCard } from '@/components/LessonCard'
import { fmt } from '@/lib/dates'
import type { MoscowClock } from '@/lib/dates'
import { kindLabels, matchesSearch, pairWord } from '@/lib/lessons'
import { isPastSubjectPair, remainingSubjectKinds, subjectIndex, subjectProgress } from './subjects'
import type { Schedule } from '@/types'

export function SubjectSearchResults({ data, query, now, onDay, organizePast = true }:
  { data: Schedule; query: string; now: MoscowClock; onDay: (date: Date) => void; organizePast?: boolean }) {
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const [limit, setLimit] = useState(30)
  const subjects = useMemo(() => subjectIndex(data.days), [data.days])
  const suggestions = useMemo(() => subjects.filter(subject => matchesSearch(subject.pairs[0].lessons[0], query)), [subjects, query])
  const selected = suggestions.find(subject => subject.key === selectedKey)
  const progress = selected ? subjectProgress(selected, now) : null
  const remainingKinds = selected ? remainingSubjectKinds(selected, now) : []
  const totalWord = progress && progress.total % 10 === 1 && progress.total % 100 !== 11 ? 'пары' : 'пар'
  const results = useMemo(() => (selected ? [selected] : suggestions)
    .flatMap(subject => subject.pairs.flatMap(pair => pair.lessons.map(lesson => ({ date: pair.date, lesson, past: isPastSubjectPair(pair, now) }))))
    .sort((a, b) => (organizePast ? Number(a.past) - Number(b.past) : 0)
      || a.date.localeCompare(b.date) || a.lesson.start.localeCompare(b.lesson.start)), [selected, suggestions, now.date, now.time, organizePast])

  function selectSubject(key: string | null) {
    setSelectedKey(key)
    setLimit(30)
  }

  return <section className="search-results">
    {selected && progress ? <>
      <button className="subject-back" onClick={() => selectSubject(null)}><ChevronLeft size={16} />Все найденные предметы</button>
      <section className="subject-summary surface-panel" aria-label="Прогресс по предмету">
        <h2>{selected.name}</h2>
        <p className="subject-count">Прошло <strong>{progress.completed} из {progress.total}</strong> {totalWord} <span>· осталось {progress.remaining}</span></p>
        <div className="subject-progress" role="progressbar" aria-label="Завершённые пары по предмету"
          aria-valuemin={0} aria-valuemax={progress.total} aria-valuenow={progress.completed}
          aria-valuetext={`Прошло ${progress.completed} из ${progress.total} ${totalWord}`}>
          <span style={{ width: `${progress.completed / progress.total * 100}%` }} />
        </div>
        {progress.current && <p className="subject-current"><i className="live-dot" aria-hidden="true" />Сейчас идёт</p>}
        <p className="section-caption">{remainingKinds.length
          ? `Осталось · ${remainingKinds.map(item => `${kindLabels[item.kind]} — ${item.count}`).join(' · ')}`
          : 'Все пары по предмету уже прошли'}</p>
      </section>
    </> : suggestions.length > 0 && <section className="subject-suggestions" aria-label="Найденные предметы">
      <div className="section-heading"><h2>Выбери предмет</h2><span>{suggestions.length}</span></div>
      <div className="subject-options">{suggestions.map(subject => <button key={subject.key} onClick={() => selectSubject(subject.key)}>
        <span><strong>{subject.name}</strong><small>{subject.pairs.length} {pairWord(subject.pairs.length)} в загруженном периоде</small></span><ArrowRight size={17} />
      </button>)}</div>
    </section>}
    <div className="section-heading"><h2>{selected ? 'Все занятия по предмету' : 'Результаты поиска'}</h2><span>{results.length}</span></div>
    {!selected && <p className="section-caption">По всему загруженному семестру</p>}
    {!results.length && <div className="state-panel"><Search size={28} /><h3>Ничего не нашлось</h3><p>Попробуй другое название предмета.</p></div>}
    {results.slice(0, limit).map(({ date, lesson, past }, index) => <div className="search-result" key={`${date}:${lesson.id}`}>
      {organizePast && past && (index === 0 || !results[index - 1].past) && <p className="past-section-heading">Уже прошли</p>}
      <button className="result-date" onClick={() => onDay(parseISO(date))}>{fmt(parseISO(date), 'd MMMM, EEEE')}<ArrowRight size={14} /></button>
      <LessonCard lesson={lesson} day={date} now={now} mutePast={organizePast && past} />
    </div>)}
    {results.length > limit && <Button variant="outline" className="load-more" onClick={() => setLimit(limit + 30)}>Показать ещё</Button>}
  </section>
}
