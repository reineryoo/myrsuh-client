import type { ReactNode } from 'react'
import { LoaderCircle, Search, X } from 'lucide-react'
import { groupShortName } from '@/config/groups'
import { findGroups } from '@/lib/groups'
import type { Group } from '@/types'

export function GroupDetails({ group }: { group: Group }) {
  return <>
    <strong>{groupShortName(group)}</strong>
    <small>{group.course} курс · группа {group.group} · {group.education}</small>
  </>
}

export function GroupCatalog({ groups, query, onQuery, renderGroup, autoFocus = false, offline = false }:
  { groups: Group[]; query: string; onQuery: (query: string) => void; renderGroup: (group: Group) => ReactNode;
    autoFocus?: boolean; offline?: boolean }) {
  if (offline) {
    return <div className="group-search-empty surface-panel" role="status">
      <span><LoaderCircle size={22} className="spin" aria-hidden="true" /></span>
      <strong>Ждём подключения</strong>
      <p>Поиск групп доступен с интернетом.</p>
    </div>
  }

  const hasQuery = Boolean(query.trim())
  const matches = hasQuery ? findGroups(groups, query) : []

  return <>
    <div className="search-field">
      <Search size={19} aria-hidden="true" />
      <input type="search" aria-label="Найти группу по названию" placeholder="Шифр группы, например ПИ ПИИ"
        value={query} onChange={event => onQuery(event.target.value)} autoComplete="off" autoFocus={autoFocus} />
      {query && <button type="button" aria-label="Очистить поиск группы" onClick={() => onQuery('')}><X size={17} /></button>}
    </div>
    {matches.length ? <div className="group-catalog-results">{matches.map(renderGroup)}</div> :
      <div className="group-search-empty surface-panel" role="status">
        <span><Search size={22} aria-hidden="true" /></span>
        <strong>{hasQuery ? 'Группы не найдены' : 'Начните вводить для поиска'}</strong>
      </div>}
  </>
}
