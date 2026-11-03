import { addDays, parseISO } from 'date-fns'
import { ArrowRight, CalendarDays, ChevronRight, Clock3, MapPin, Search } from 'lucide-react'
import { DayStrip } from '@/components/DayStrip'
import { dateKey, fmt, lessonProgress, timeUntil } from '@/lib/dates'
import type { MoscowClock } from '@/lib/dates'
import { dayState, greeting } from '@/lib/day-state'
import { displayNickname, nicknameInitial } from '@/lib/nickname'
import { groupPairs, lessonBadges, lessonKind, pairWord } from '@/lib/lessons'
import { cn } from '@/lib/utils'
import type { Day, Lesson, Schedule } from '@/types'

export function HomePage({ data, days, date, now, onDate, onCalendar, onDetails, onSettings, onSearch, organizePast = true, nickname = '' }:
  { data?: Schedule; days: Map<string, Day>; date: Date; now: MoscowClock; onDate: (date: Date) => void;
    onCalendar: (date: Date) => void; onDetails: (date: Date, lessons: Lesson[]) => void; onSettings: () => void; onSearch: () => void; organizePast?: boolean; nickname?: string }) {
  const name = displayNickname(nickname)
  const key = dateKey(date)
  const lessons = days.get(key)?.lessons ?? []
  const state = dayState(lessons, key, now)
  const available = !!data && key >= data.period_start && key <= data.period_end
  const isToday = key === now.date
  const tomorrow = addDays(parseISO(now.date), 1)
  const tomorrowLessons = days.get(dateKey(tomorrow))?.lessons
  const tomorrowPairs = tomorrowLessons ? groupPairs(tomorrowLessons) : null
  const tomorrowText = tomorrowPairs ? tomorrowPairs.length ? `Завтра ${tomorrowPairs.length} ${pairWord(tomorrowPairs.length)}, первая в ${tomorrowPairs[0][1][0].start}` : 'Завтра занятий нет' : 'Расписание на завтра пока недоступно'
  const focus = state.focus?.[1][0]
  const progress = focus ? lessonProgress(focus, key, now) : null
  const remaining = state.upcoming.filter(([pair]) => pair !== state.focus?.[0])
  const label = isToday ? 'Сегодня' : fmt(date, 'EEEE, d MMMM')

  function renderRow(entries: Lesson[], past = false) {
    const lesson = entries[0]
    return <button className={cn('home-lesson-row', lessonKind(lesson.lesson_type), past && 'past-lesson')} key={lesson.id}
      onClick={() => onDetails(date, entries)} aria-label={`${lesson.start}, ${lesson.subject}${entries.length > 1 ? `, записей: ${entries.length}` : ''}`}>
      <span className="home-row-time"><strong>{lesson.start}</strong><span>{lesson.end}</span></span>
      <span className="home-row-type">{lessonBadges(lesson.lesson_type).map(badge => badge.label).join(' / ') || 'ПАРА'}</span>
      <span className="home-row-info"><strong>{lesson.subject}</strong><small>{lesson.room ?? 'Аудитория не указана'}{entries.length > 1 && ` · ещё ${entries.length - 1}`}</small></span><ChevronRight size={15} />
    </button>
  }

  const focusCard = focus && available ? <button className={cn('home-focus-card', lessonKind(focus.lesson_type), progress !== null && 'home-focus-current')} onClick={() => onDetails(date, state.focus![1])}>
      <div className="home-focus-status-row"><span className="home-focus-status">{progress !== null ? <><i className="live-dot" aria-hidden="true" />Сейчас идёт</> : isToday ? `${state.state === 'before' ? 'Первая' : 'Следующая'} пара через ${timeUntil(focus.start, now.time)}` : 'Первая пара'}</span>{progress !== null && <span className="home-focus-remaining">ещё {timeUntil(focus.end, now.time)}</span>}</div>
      <div className="home-focus-body"><span className="home-focus-time"><strong>{focus.start}</strong><span>{focus.end}</span><small>{focus.pair} пара</small></span><span className="home-focus-info"><strong>{focus.subject}</strong><span className="home-focus-meta">{lessonBadges(focus.lesson_type).map((badge, index) => <span className={cn('type-badge', badge.kind)} key={index}>{badge.label}</span>)}<span><MapPin size={12} />{focus.room ?? 'Аудитория не указана'}</span></span><small>{focus.teacher_full ?? focus.teacher ?? 'Преподаватель не указан'}</small>{state.focus![1].length > 1 && <small>Ещё {state.focus![1].length - 1} одновременно · нажми для просмотра</small>}</span><ChevronRight size={18} /></div>
      {progress !== null && <span className="home-focus-progress" role="progressbar" aria-label="Прогресс текущей пары" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.floor(progress * 100)} aria-valuetext={`До конца ${timeUntil(focus.end, now.time)}`}><i style={{ width: `${progress * 100}%` }} /></span>}
    </button> : null

  return <section className="home-page">
    <header className="home-topbar"><button className="student-avatar" onClick={onSettings} aria-label="Профиль — настройки" title={name}>{nicknameInitial(nickname)}</button><span className="home-clock"><Clock3 size={12} />{now.time}<span>МСК</span></span><button className="home-search-button" onClick={onSearch} aria-label="Поиск в календаре"><Search size={20} /></button></header>
    <h1 className="greeting">{greeting(now.time)},<span className="greeting-nickname" title={name}>{name}</span></h1>
    <p className="home-subtitle">{label}{data ? available ? ` · ${state.pairs.length} ${pairWord(state.pairs.length)}${lessons.length ? ` · ${state.state === 'finished' ? 'на сегодня всё' : `первая в ${lessons[0].start}`}` : ''}` : ' · нет данных на эту дату' : ' · загружаем расписание'}</p>
    <DayStrip date={date} today={now.date} days={days} onSelect={onDate} />
    <div className="content-transition" key={key}>
    {data && !available && <div className="home-state-panel"><h2>Расписание пока недоступно</h2><p>На эту дату университет ещё не предоставил данные.</p><button onClick={() => onDate(parseISO(now.date))}>К сегодняшнему дню <ArrowRight size={14} /></button></div>}
    {available && (state.state === 'finished' || state.state === 'empty') && <div className="home-state-panel">
      <h2>{state.state === 'empty' ? isToday ? 'Сегодня пар нет.' : 'В этот день пар нет.' : isToday ? 'На сегодня всё.' : 'Занятия закончились.'}</h2>
      <p>{isToday ? tomorrowText : fmt(date, 'd MMMM, EEEE')}</p>
      <div className="home-state-actions"><button className="subtle-action" onClick={() => onCalendar(date)}><CalendarDays size={14} />В календарь</button><button className="tomorrow-button" onClick={() => onDate(isToday ? tomorrow : parseISO(now.date))}>{isToday ? 'План на завтра' : 'Сегодня'}<ArrowRight size={14} /></button></div>
    </div>}
    {available && (organizePast ? <>
      {focusCard}
      {remaining.length > 0 && <div className="home-lesson-list">{remaining.map(([, entries]) => renderRow(entries))}</div>}
      {state.past.length > 0 && <><div className="home-past-heading"><span>Уже прошли</span><button onClick={() => onCalendar(date)}>Весь день <ChevronRight size={13} /></button></div><div className="home-lesson-list">{state.past.map(([, entries]) => renderRow(entries, true))}</div></>}
    </> : <div className="home-lesson-list home-static-list">{state.pairs.map(([pair, entries]) => <div className="home-static-entry" key={pair}>{pair === state.focus?.[0] ? focusCard : renderRow(entries)}</div>)}</div>)}
    {available && state.past.length === 0 && <button className="open-day-link" onClick={() => onCalendar(date)}>Расписание на весь день <ArrowRight size={15} /></button>}
    </div>
  </section>
}
