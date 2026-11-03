import { useMemo, useRef, useState } from 'react'
import { isSameMonth, parseISO } from 'date-fns'
import { ArrowRight, CalendarDays, CalendarRange, ChevronLeft, ChevronRight, RefreshCw, Search, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DaySchedule } from '@/components/DaySchedule'
import { DayStrip } from '@/components/DayStrip'
import { GroupPicker } from '@/components/GroupPicker'
import { LessonCard } from '@/components/LessonCard'
import { MonthGrid } from '@/components/MonthGrid'
import { WeekGrid } from '@/components/WeekGrid'
import { dateKey, fmt, monthsBetween, moveCalendarDate, semesterWeek, swipeDate, weekDays } from '@/lib/dates'
import type { MoscowClock } from '@/lib/dates'
import { groupPairs, matchesSearch, pairKinds, pairWord } from '@/lib/lessons'
import type { LessonKind } from '@/lib/lessons'
import { cn } from '@/lib/utils'
import type { Day, Group, Lesson, Schedule } from '@/types'

export type CalendarView = 'day' | 'week' | 'month' | 'semester'
const views = [{ id: 'day', label: 'День' }, { id: 'week', label: 'Неделя' }, { id: 'month', label: 'Месяц' }] as const
const kindLabels: Record<LessonKind, string> = { lecture: 'Лекции', practice: 'Практика', combined: 'Лек. + сем.', exam: 'Экзамены', neutral: 'Другие' }

export function CalendarPage({ data, days, date, view, now, group, savedGroups, onDate, onView, onGroupSelect, onManageGroups, onDetails, onRefresh, refreshing, cooldown, organizePast = true }:
  { data: Schedule; days: Map<string, Day>; date: Date; view: CalendarView; now: MoscowClock; group?: Group; savedGroups: Group[];
    onDate: (date: Date) => void; onView: (view: CalendarView) => void; onGroupSelect: (id: string) => void; onManageGroups: () => void;
    onDetails: (date: Date, lessons: Lesson[]) => void; onRefresh?: () => void; refreshing: boolean; cooldown: boolean; organizePast?: boolean }) {
  const [search, setSearch] = useState('')
  const [searchLimit, setSearchLimit] = useState(30)
  const swipeStart = useRef<number | null>(null)
  const key = dateKey(date)
  const week = weekDays(date)
  const lessons = days.get(key)?.lessons ?? []
  const available = key >= data.period_start && key <= data.period_end
  const semester = semesterWeek(date, data.period_start, data.period_end)
  const pairs = groupPairs(lessons)
  const weekAvailable = week.some(item => days.has(dateKey(item)))
  const weekCount = week.reduce((total, item) => total + groupPairs(days.get(dateKey(item))?.lessons ?? []).length, 0)
  const month = data.days.filter(day => day.date.startsWith(fmt(date, 'yyyy-MM')))
  const monthKinds = month.flatMap(day => pairKinds(day.lessons))
  const monthStats = (Object.keys(kindLabels) as LessonKind[]).map(kind => ({ kind, count: monthKinds.filter(value => value === kind).length })).filter(item => item.count)
  const range = `${fmt(week[0], 'd')}${isSameMonth(week[0], week[6]) ? '' : ` ${fmt(week[0], 'MMM')}`}–${fmt(week[6], 'd MMMM')}`
  const results = useMemo(() => search.trim() ? data.days.flatMap(day => day.lessons.filter(lesson => matchesSearch(lesson, search)).map(lesson => ({ date: day.date, lesson }))) : [], [data, search])

  function selectDay(value: Date) { onDate(value); onView('day'); setSearch('') }
  function move(direction: number) {
    if (view !== 'semester') onDate(moveCalendarDate(date, view === 'month' ? 'month' : 'week', direction))
  }
  function swipe(endX: number) { const value = swipeDate(key, swipeStart.current, endX); swipeStart.current = null; if (value) onDate(value) }
  function today() { onDate(parseISO(now.date)); if (view === 'semester') onView('day'); setSearch('') }

  return <section className="calendar-page">
    <header className="app-header"><p className="app-eyebrow">{semester ? `${semester.current}-я неделя из ${semester.total} в семестре` : 'Вне загруженного семестра'}</p>
      <div className="header-title-row"><h1>Пары</h1><div className="header-actions"><GroupPicker group={group} savedGroups={savedGroups} onSelect={onGroupSelect} onManage={onManageGroups} /><button className="circle-button" aria-label="Обзор семестра" onClick={() => { onView('semester'); setSearch('') }}><CalendarRange size={20} /></button></div></div>
      <div className="search-row">
        <label className="search-field">
          <Search size={18} />
          <input type="search" value={search} placeholder="Поиск по предметам" aria-label="Поиск по расписанию"
            onChange={event => {
              setSearch(event.target.value)
              setSearchLimit(30)
            }} />
          {search && <button onClick={() => setSearch('')} aria-label="Очистить поиск"><X size={17} /></button>}
        </label>
        {onRefresh && <button className="circle-button refresh-button" aria-label="Обновить расписание"
          onClick={onRefresh} disabled={refreshing || cooldown}>
          <RefreshCw size={20} className={cn(refreshing && 'spin')} />
        </button>}
      </div>
    </header>
    <div className="view-switch" aria-label="Вид расписания">{views.map(mode => <button key={mode.id} aria-pressed={!search.trim() && view === mode.id} className={cn(!search.trim() && view === mode.id && 'selected')} onClick={() => { onView(mode.id); setSearch('') }}>{mode.label}</button>)}</div>

    <div className="content-transition" key={search.trim() ? 'search' : `${view}:${key}`}>
    {search.trim() ? <section className="search-results"><div className="section-heading"><h2>Результаты поиска</h2><span>{results.length}</span></div><p className="section-caption">По всему загруженному семестру</p>
      {!results.length && <div className="state-panel"><Search size={28} /><h3>Ничего не нашлось</h3><p>Попробуй другое название предмета.</p></div>}
      {results.slice(0, searchLimit).map(({ date: resultDate, lesson }) => <div className="search-result" key={lesson.id}><button className="result-date" onClick={() => selectDay(parseISO(resultDate))}>{fmt(parseISO(resultDate), 'd MMMM, EEEE')}<ArrowRight size={14} /></button><LessonCard lesson={lesson} day={resultDate} now={now} /></div>)}
      {results.length > searchLimit && <Button variant="outline" className="load-more" onClick={() => setSearchLimit(searchLimit + 30)}>Показать ещё</Button>}
    </section> : view === 'semester' ? <section className="semester-view"><div className="section-heading"><h2>Весь семестр</h2><CalendarRange size={21} /></div><p className="section-caption">{fmt(parseISO(data.period_start), 'd MMM yyyy')} — {fmt(parseISO(data.period_end), 'd MMM yyyy')}</p><div className="semester-grid">{monthsBetween(data.period_start, data.period_end).map(item => <section className="semester-month surface-panel" key={dateKey(item)}><div className="month-heading"><h3>{fmt(item, 'LLLL')}</h3><span>{fmt(item, 'yyyy')}</span></div><MonthGrid compact month={item} today={now.date} days={days} selected={key} onSelect={selectDay} start={data.period_start} end={data.period_end} /></section>)}</div></section> : <>
      <div className="period-navigation">
        <div className="period-arrows">
          <button aria-label={view === 'month' ? 'Предыдущий месяц' : 'Предыдущая неделя'} onClick={() => move(-1)}><ChevronLeft size={19} /></button>
          <span>{view === 'month' ? fmt(date, 'LLLL yyyy') : `${range} ${fmt(week[6], 'yyyy')}`}</span>
          <button aria-label={view === 'month' ? 'Следующий месяц' : 'Следующая неделя'} onClick={() => move(1)}><ChevronRight size={19} /></button>
        </div>
        <button className="today-button" onClick={today}>Сегодня</button>
      </div>
      {view === 'day' && <><DayStrip date={date} today={now.date} days={days} onSelect={onDate} /><div className="section-heading day-title"><h2>{key === now.date ? 'Сегодня' : fmt(date, 'EEEE, d')}</h2><span>{available ? `${pairs.length} ${pairWord(pairs.length)}` : 'Нет данных'}</span></div><p className="section-caption day-caption">{fmt(date, 'd MMMM')}{lessons.length > 0 && ` · ${lessons[0].start}–${lessons.at(-1)!.end}`}<span>МСК</span></p><div className="swipe-surface" onPointerDown={event => { swipeStart.current = event.clientX }} onPointerUp={event => swipe(event.clientX)} onPointerCancel={() => { swipeStart.current = null }}><DaySchedule day={key} lessons={lessons} now={now} available={available} organizePast={organizePast} /></div></>}
      {view === 'week' && <section className="week-view"><div className="section-heading"><h2>Твоя неделя</h2><span>{weekAvailable ? `${weekCount} ${pairWord(weekCount)}` : 'Нет данных'}</span></div>{!weekAvailable && <div className="period-warning"><CalendarRange size={17} /><p>Этот период недоступен.</p><button onClick={() => onDate(parseISO(data.period_start))}>К расписанию <ArrowRight size={14} /></button></div>}{weekAvailable && weekCount === 0 && <p className="empty-period-note">На этой неделе занятий нет.</p>}<div className="surface-panel week-panel"><WeekGrid dates={week} days={days} schedule={data} selected={key} now={now} onDay={selectDay} onLessons={onDetails} /></div><p className="week-hint">Нажми на пару, чтобы посмотреть подробности</p></section>}
      {view === 'month' && <><section className="surface-panel month-panel"><div className="month-heading"><h2>{fmt(date, 'LLLL')}</h2><span>{fmt(date, 'yyyy')} · {data.semester}</span></div><MonthGrid month={date} today={now.date} days={days} selected={key} onSelect={selectDay} start={data.period_start} end={data.period_end} />{month.length === 0 && <p className="empty-period-note">Данные за этот месяц пока недоступны.</p>}</section>{month.length > 0 && <section className="month-summary surface-panel"><h3>В этом месяце</h3>{monthStats.length ? <><div className="month-distribution">{monthStats.map(item => <i key={item.kind} className={item.kind} style={{ flexGrow: item.count }} />)}</div><div className="month-stat-labels">{monthStats.map(item => <span key={item.kind}><i className={item.kind} />{kindLabels[item.kind]} <strong>{item.count}</strong></span>)}</div></> : <p>В доступной части месяца занятий нет.</p>}</section>}</>}
    </>}
    </div>
    {view !== 'month' && <div className="calendar-legend"><span><i className="lecture" />Лекции</span><span><i className="practice" />Практика</span><span><i className="combined" />Лек. + сем.</span><span><i className="exam" />Экзамены</span></div>}
    <button className="calendar-today-fab" onClick={today} aria-label="Вернуться к сегодняшней дате"><CalendarDays size={16} />Сегодня</button>
  </section>
}
