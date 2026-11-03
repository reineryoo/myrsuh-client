import { useState } from 'react'
import { ArrowLeft, Check, ChevronRight, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { GroupCatalog, GroupDetails } from '@/components/GroupCatalog'
import { groupShortName } from '@/config/groups'
import { dayState } from '@/lib/day-state'
import { timeUntil, type MoscowClock } from '@/lib/dates'
import { pairWord } from '@/lib/lessons'
import type { Group, Lesson } from '@/types'

export function GroupManager({ groups, savedIds, selected, todayLessons, now, searchOffline, onAdd, onRemove, onSelect, onBack }:
  { groups: Group[]; savedIds: string[]; selected: string | null; todayLessons?: Lesson[]; now: MoscowClock;
    searchOffline?: boolean; onAdd: (id: string) => void; onRemove: (id: string) => void; onSelect: (id: string) => void; onBack: () => void }) {
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState(false)
  const [query, setQuery] = useState('')
  const current = groups.find(group => group.id === selected)
  const others = groups.filter(group => group.id !== selected && savedIds.includes(group.id))

  function showSearch() {
    setQuery('')
    setAdding(true)
  }

  const today = todayLessons && dayState(todayLessons, now.date, now)
  const lesson = today?.focus?.[1][0]

  function savedCard(group: Group, main = false) {
    return <div className={main ? 'schedule-card primary-schedule' : 'schedule-card'} key={group.id}>
      <div className="schedule-card-top">
        <button className="schedule-card-open" aria-current={main ? 'true' : undefined} onClick={() => onSelect(group.id)}>
          <span className="schedule-group-number" aria-hidden="true">{group.group}</span>
          <span className="schedule-card-copy">
            <GroupDetails group={group} />
            {main && <span className="schedule-current-badge">Моё</span>}
            {main && today && <small>{today.pairs.length ? `${today.pairs.length} ${pairWord(today.pairs.length)} сегодня` : 'Сегодня пар нет'}</small>}
          </span>
          {!main && !editing && <ChevronRight size={18} aria-hidden="true" />}
        </button>
        {editing && <button className="schedule-remove" type="button"
          aria-label={`Убрать ${groupShortName(group)}, ${group.course} курс, группа ${group.group}`}
          onClick={() => onRemove(group.id)}><Trash2 size={18} /></button>}
      </div>
      {main && lesson && <>
        <p className="schedule-lesson-caption">{today?.current ? 'Сейчас' : 'Следующая пара'}</p>
        <button className="schedule-lesson-preview" onClick={() => onSelect(group.id)}>
          <i aria-hidden="true" />
          <span><strong>{lesson.subject}</strong>
            <small>{today?.current ? `До ${lesson.end} · осталось ${timeUntil(lesson.end, now.time)}` : `В ${lesson.start}`}{lesson.room && ` · ${lesson.room}`}</small>
          </span>
          <ChevronRight size={17} aria-hidden="true" />
        </button>
      </>}
    </div>
  }

  return <section className="group-manager">
    <header className="schedule-manager-header">
      <button className="circle-button" aria-label="Назад" onClick={adding ? () => setAdding(false) : onBack}><ArrowLeft size={20} /></button>
      <h1>{adding ? 'Добавить расписание' : 'Расписания'}</h1>
      {!adding && <>
        <button className="circle-button" aria-label={editing ? 'Завершить редактирование' : 'Редактировать расписания'}
          aria-pressed={editing} onClick={() => setEditing(value => !value)}>{editing ? <Check size={20} /> : <Pencil size={20} />}</button>
        {!editing && <button className="circle-button" aria-label="Поиск групп" onClick={showSearch}><Search size={20} /></button>}
      </>}
    </header>
    {adding ? <div className="content-transition">
      <GroupCatalog autoFocus offline={searchOffline} groups={groups} query={query} onQuery={setQuery} renderGroup={group => {
        const added = savedIds.includes(group.id)
        return <article className="group-search-result" key={group.id}>
          <div><GroupDetails group={group} /></div>
          <button onClick={() => { onAdd(group.id); setAdding(false) }} disabled={added}
            aria-label={added ? 'Группа добавлена' : `Добавить ${groupShortName(group)}, ${group.course} курс, группа ${group.group}, ${group.education}`}>
            {added ? <Check size={18} /> : <Plus size={20} />}<span>{added ? 'Добавлено' : 'Добавить'}</span>
          </button>
        </article>
      }} />
    </div> : <>
      {current && <section className="schedule-manager-section">
        <h2>Основное</h2>
        {savedCard(current, true)}
      </section>}
      {others.length > 0 && <section className="schedule-manager-section">
        <div className="schedule-section-heading">
          <h2>Группы</h2>
          <button onClick={() => setEditing(value => !value)}>{editing ? 'Готово' : 'Редактировать'}</button>
        </div>
        <div className="saved-groups">{others.map(group => savedCard(group))}</div>
      </section>}
      {!editing && <button className="schedule-add-fab" aria-label="Добавить расписание" onClick={showSearch}><Plus size={26} /></button>}
    </>}
  </section>
}
