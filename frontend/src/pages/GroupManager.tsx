import { useState, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Check, ChevronRight, LoaderCircle, Pencil, Plus, Search, Trash2, UserRound, X } from 'lucide-react'
import { GroupCatalog, GroupDetails } from '@/components/GroupCatalog'
import { Button } from '@/components/ui/button'
import { groupShortName } from '@/config/groups'
import { dayState } from '@/lib/day-state'
import { timeUntil, type MoscowClock } from '@/lib/dates'
import { normalizeSubject, pairWord } from '@/lib/lessons'
import { requestTeachers } from '@/services/api'
import type { Group, Lesson, Teacher } from '@/types'

export function GroupManager({ groups, savedIds, selected, savedTeachers, activeTeacher, todayLessons, now, searchOffline, teacherSearchOffline,
  onAdd, onRemove, onSelect, onTeacherAdd, onTeacherRemove, onTeacherSelect, onBack }:
  { groups: Group[]; savedIds: string[]; selected: string | null; todayLessons?: Lesson[]; now: MoscowClock;
    savedTeachers: Teacher[]; activeTeacher?: Teacher; searchOffline?: boolean; teacherSearchOffline: boolean;
    onAdd: (id: string) => void; onRemove: (id: string) => void;
    onSelect: (id: string) => void; onTeacherAdd: (teacher: Teacher) => void; onTeacherRemove: (id: string) => void;
    onTeacherSelect: (id: string) => void; onBack: () => void }) {
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState(false)
  const [query, setQuery] = useState('')
  const [mode, setMode] = useState<'group' | 'teacher'>('group')
  const current = activeTeacher ? undefined : groups.find(group => group.id === selected)
  const others = groups.filter(group => group.id !== current?.id && savedIds.includes(group.id))
  const otherTeachers = savedTeachers.filter(teacher => teacher.id !== activeTeacher?.id)

  function showSearch() {
    setQuery('')
    setMode('group')
    setAdding(true)
  }

  function switchMode(value: 'group' | 'teacher') {
    setMode(value)
    setQuery('')
  }

  const today = todayLessons && dayState(todayLessons, now.date, now)
  const lesson = today?.focus?.[1][0]

  function savedCard({ id, icon, label, details, open, remove, main = false }:
    { id: string; icon: ReactNode; label: string; details: ReactNode; open: () => void; remove: () => void; main?: boolean }) {
    return <div className={main ? 'schedule-card primary-schedule' : 'schedule-card'} key={id}>
      <div className="schedule-card-top">
        <button className="schedule-card-open" aria-current={main ? 'true' : undefined} onClick={open}>
          <span className="schedule-group-number" aria-hidden="true">{icon}</span>
          <span className="schedule-card-copy">
            {details}
            {main && <span className="schedule-current-badge">Моё</span>}
            {main && today && <small>{today.pairs.length ? `${today.pairs.length} ${pairWord(today.pairs.length)} сегодня` : 'Сегодня пар нет'}</small>}
          </span>
          {!main && !editing && <ChevronRight size={18} aria-hidden="true" />}
        </button>
        {editing && <button className="schedule-remove" type="button"
          aria-label={`Убрать ${label}`} onClick={remove}><Trash2 size={18} /></button>}
      </div>
      {main && lesson && <>
        <p className="schedule-lesson-caption">{today?.current ? 'Сейчас' : 'Следующая пара'}</p>
        <button className="schedule-lesson-preview" onClick={open}>
          <i aria-hidden="true" />
          <span><strong>{lesson.subject}</strong>
            <small>{today?.current ? `До ${lesson.end} · осталось ${timeUntil(lesson.end, now.time)}` : `В ${lesson.start}`}{lesson.room && ` · ${lesson.room}`}</small>
          </span>
          <ChevronRight size={17} aria-hidden="true" />
        </button>
      </>}
    </div>
  }

  const groupCard = (group: Group, main = false) => savedCard({
    id: group.id, icon: group.group, label: `${groupShortName(group)}, ${group.course} курс, группа ${group.group}`,
    details: <GroupDetails group={group} />, open: () => onSelect(group.id), remove: () => onRemove(group.id), main,
  })
  const teacherCard = (teacher: Teacher, main = false) => savedCard({
    id: `teacher:${teacher.id}`, icon: <UserRound size={18} />, label: teacher.name,
    details: <><strong>{teacher.name}</strong><small>Преподаватель</small></>,
    open: () => onTeacherSelect(teacher.id), remove: () => onTeacherRemove(teacher.id), main,
  })

  return <section className="group-manager">
    <header className="schedule-manager-header">
      <button className="circle-button" aria-label="Назад" onClick={adding ? () => setAdding(false) : onBack}><ArrowLeft size={20} /></button>
      <h1>{adding ? 'Добавить расписание' : 'Расписания'}</h1>
      {!adding && <>
        <button className="circle-button" aria-label={editing ? 'Завершить редактирование' : 'Редактировать расписания'}
          aria-pressed={editing} onClick={() => setEditing(value => !value)}>{editing ? <Check size={20} /> : <Pencil size={20} />}</button>
        {!editing && <button className="circle-button" aria-label="Поиск расписаний" onClick={showSearch}><Search size={20} /></button>}
      </>}
    </header>
    {adding ? <div className="content-transition">
      <div className="view-switch schedule-search-switch" aria-label="Тип расписания">
        <button aria-pressed={mode === 'group'} className={mode === 'group' ? 'selected' : undefined} onClick={() => switchMode('group')}>Группа</button>
        <button aria-pressed={mode === 'teacher'} className={mode === 'teacher' ? 'selected' : undefined} onClick={() => switchMode('teacher')}>Преподаватель</button>
      </div>
      {mode === 'teacher' ? <TeacherSearch query={query} onQuery={setQuery} offline={teacherSearchOffline} savedTeachers={savedTeachers}
        onAdd={teacher => { onTeacherAdd(teacher); setAdding(false) }} /> :
      <GroupCatalog autoFocus offline={searchOffline} groups={groups} query={query} onQuery={setQuery} renderGroup={group => {
        const added = savedIds.includes(group.id)
        return <article className="group-search-result" key={group.id}>
          <div><GroupDetails group={group} /></div>
          <button onClick={() => { onAdd(group.id); setAdding(false) }} disabled={added}
            aria-label={added ? 'Группа добавлена' : `Добавить ${groupShortName(group)}, ${group.course} курс, группа ${group.group}, ${group.education}`}>
            {added ? <Check size={18} /> : <Plus size={20} />}<span>{added ? 'Добавлено' : 'Добавить'}</span>
          </button>
        </article>
      }} />}
    </div> : <>
      {(current || activeTeacher) && <section className="schedule-manager-section">
        <h2>Основное</h2>
        {activeTeacher ? teacherCard(activeTeacher, true) : current && groupCard(current, true)}
      </section>}
      {others.length > 0 && <section className="schedule-manager-section">
        <div className="schedule-section-heading">
          <h2>Группы</h2>
          <button onClick={() => setEditing(value => !value)}>{editing ? 'Готово' : 'Редактировать'}</button>
        </div>
        <div className="saved-groups">{others.map(group => groupCard(group))}</div>
      </section>}
      {otherTeachers.length > 0 && <section className="schedule-manager-section">
        <h2>Преподаватели</h2>
        <div className="saved-groups">{otherTeachers.map(teacher => teacherCard(teacher))}</div>
      </section>}
      {!editing && <button className="schedule-add-fab" aria-label="Добавить расписание" onClick={showSearch}><Plus size={26} /></button>}
    </>}
  </section>
}

function TeacherSearch({ query, onQuery, offline, savedTeachers, onAdd }:
  { query: string; onQuery: (query: string) => void; offline?: boolean; savedTeachers: Teacher[]; onAdd: (teacher: Teacher) => void }) {
  const normalized = normalizeSubject(query)
  const catalog = useQuery({
    queryKey: ['teachers'], queryFn: requestTeachers, enabled: !!normalized && !offline,
    staleTime: 15 * 60 * 1000,
  })
  if (offline) return <div className="group-search-empty surface-panel" role="status">
    <span><LoaderCircle size={22} className="spin" aria-hidden="true" /></span>
    <strong>Ждём подключения</strong>
    <p>Поиск преподавателей доступен с интернетом.</p>
  </div>

  const matches = normalized ? (catalog.data ?? []).filter(teacher => normalizeSubject(teacher.name).includes(normalized)) : []
  return <>
    <div className="search-field">
      <Search size={19} aria-hidden="true" />
      <input type="search" aria-label="Фамилия преподавателя" placeholder="Фамилия преподавателя" autoComplete="off"
        value={query} onChange={event => onQuery(event.target.value)} />
      {query && <button type="button" aria-label="Очистить поиск преподавателя" onClick={() => onQuery('')}><X size={17} /></button>}
    </div>
    {matches.length > 0 ? <div className="teacher-search-results">
      <p>Найдено · {matches.length}</p>
      {matches.map(teacher => {
        const saved = savedTeachers.some(item => item.id === teacher.id)
        return <article className="teacher-search-result surface-panel" key={teacher.id}>
          <span className="teacher-search-icon"><UserRound size={19} aria-hidden="true" /></span>
          <strong>{teacher.name}</strong>
          <button type="button" className="ui-button button-primary teacher-add-button" disabled={saved} onClick={() => onAdd(teacher)}
            aria-label={saved ? `${teacher.name} добавлен` : `Добавить ${teacher.name}`}>
            {saved ? <Check size={16} /> : <Plus size={16} />}{saved ? 'Добавлено' : 'Добавить'}
          </button>
        </article>
      })}
    </div> : normalized && !catalog.data && (catalog.isPending || catalog.isError) ? <div className="group-search-empty surface-panel" role="status">
      <strong>{catalog.isError ? 'Не удалось загрузить список преподавателей' : 'Загружаем преподавателей…'}</strong>
      {catalog.isError && <Button variant="outline" onClick={() => void catalog.refetch()}>Повторить</Button>}
    </div> : <div className="group-search-empty surface-panel" role="status">
      <span><Search size={22} aria-hidden="true" /></span>
      <strong>{normalized ? 'Преподаватели не найдены' : 'Начните вводить для поиска'}</strong>
    </div>}
  </>
}
