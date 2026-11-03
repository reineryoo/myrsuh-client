import { renderToStaticMarkup } from 'react-dom/server'
import { parseISO } from 'date-fns'
import { describe, expect, it } from 'vitest'
import { HomePage } from './HomePage'
import { SettingsPage } from './SettingsPage'
import type { Day, Lesson, Schedule } from '@/types'

const lesson: Lesson = { id:'a', pair:5, start:'15:35',end:'16:55',subject:'Тестовая дисциплина',lesson_type:'лек; сем',room:'114',teacher:null,teacher_full:null,group:null,subgroup:null,source:{} }
const date = '2026-11-03'
const tomorrow = '2026-11-04'
function renderHome(time: string, todayLessons: Lesson[] = [lesson], organizePast = true, nickname = '') {
  const days = new Map<string, Day>([[date,{date,lessons:todayLessons}],[tomorrow,{date:tomorrow,lessons:[{...lesson,id:'tomorrow'}]}]])
  const data: Schedule = { group_id:'119_1',period_start:date,period_end:tomorrow,days:[...days.values()],bells:{'5':['15:35','16:55']},academic_year:null,semester:null,university_updated_at:null,fetched_at:'2026-11-03T12:00:00+03:00',stale:false,warning:null }
  return renderToStaticMarkup(<HomePage nickname={nickname} data={data} days={days} date={parseISO(date)} now={{date,time}} organizePast={organizePast} onDate={() => {}} onCalendar={() => {}} onDetails={() => {}} onSettings={() => {}} onSearch={() => {}} />)
}

describe('student home page', () => {
  it('replaces Student with a sanitized nickname and its avatar initial', () => {
    const html = renderHome('14:35', [lesson], true, '🔥Reiner')
    expect(html).toContain('class="greeting-nickname" title="Reiner">Reiner</span>')
    expect(html).toContain('aria-label="Профиль — настройки" title="Reiner">R</button>')
    expect(html).not.toContain('Студент')
    expect(html).not.toContain('🔥')
  })
  it('greets Student and gives the real first-pair countdown without stories', () => {
    const html = renderHome('14:35')
    expect(html).toContain('Добрый день')
    expect(html).toContain('Студент')
    expect(html).toContain('Первая пара через 1 ч')
    expect(html).toContain('ЛЕК · СЕМ')
    expect(html).not.toContain('истории')
  })
  it('highlights a current class', () => {
    const html = renderHome('16:00')
    expect(html).toContain('Сейчас идёт')
    expect(html).toContain('ещё 55 мин')
    expect(html).toContain('aria-valuenow="31"')
    expect(html).toContain('home-focus-current')
  })
  it('shows progress from the exact start, halfway through, and removes it at the end', () => {
    expect(renderHome('15:34')).not.toContain('role="progressbar"')
    const start = renderHome('15:35')
    expect(start).toContain('aria-valuenow="0"')
    expect(start).toContain('До конца 1 ч 20 мин')
    const halfway = renderHome('16:15')
    expect(halfway).toContain('aria-valuenow="50"')
    expect(halfway).toContain('ещё 40 мин')
    const lastMinute = renderHome('16:54')
    expect(lastMinute).toContain('ещё 1 мин')
    const finished = renderHome('16:55')
    expect(finished).not.toContain('role="progressbar"')
    expect(finished).not.toContain('Сейчас идёт')
    expect(finished).toContain('На сегодня всё.')
  })
  it('shows the finished panel, actual tomorrow plan and muted past cards', () => {
    const html = renderHome('23:00')
    expect(html).toContain('На сегодня всё.')
    expect(html).toContain('Завтра 1 пара, первая в 15:35')
    expect(html).toContain('План на завтра')
    expect(html).toContain('past-lesson')
  })
  it('shows a genuine empty day with a tomorrow action', () => {
    const html = renderHome('12:00',[])
    expect(html).toContain('Сегодня пар нет.')
    expect(html).toContain('План на завтра')
    expect(html).not.toContain('home-focus-card')
  })
  it('keeps group selection out of settings', () => {
    const html = renderToStaticMarkup(<SettingsPage theme="dark" onTheme={() => {}} onReset={() => {}} onRefresh={() => {}} refreshing={false} cooldown={false} />)
    expect(html).toContain('Оформление')
    expect(html).toContain('На экран iPhone')
    expect(html).not.toContain('Сменить группу')
    expect(html).not.toContain('settings-group')
  })
  it('keeps past lessons colored and chronological when organization is disabled', () => {
    const lessons = [{ ...lesson, id:'early',pair:1,start:'08:45',end:'10:05',subject:'Ранняя пара' }, lesson]
    const chronological = renderHome('16:00',lessons,false)
    const organized = renderHome('16:00',lessons,true)
    expect(chronological).not.toContain('past-lesson')
    expect(chronological.indexOf('Ранняя пара')).toBeLessThan(chronological.indexOf('Тестовая дисциплина'))
    expect(organized.indexOf('Ранняя пара')).toBeGreaterThan(organized.indexOf('Тестовая дисциплина'))
    expect(organized).toContain('past-lesson')
    expect(chronological).toContain('greeting-nickname')
  })
})
