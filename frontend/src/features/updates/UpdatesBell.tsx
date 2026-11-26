import { useEffect, useRef, useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { parseISO } from 'date-fns'
import { Bell, X } from 'lucide-react'
import { fmt } from '@/lib/dates'
import { READ_UPDATES_KEY, readSetting, saveSetting } from '@/lib/storage'
import { cn } from '@/lib/utils'
import updates from './updates.json'
import './updates.css'

const releases = [...updates].sort((left, right) => right.date.localeCompare(left.date))
const dateLabel = (date: string) => fmt(parseISO(date), 'dd-MM-yy')

function readUpdateIds() {
  try {
    const saved: unknown = JSON.parse(readSetting(READ_UPDATES_KEY) ?? '[]')
    if (Array.isArray(saved)) return new Set(saved.filter((id): id is string => typeof id === 'string'))
  } catch { /* A malformed setting can be replaced the next time an update is opened. */ }
  return new Set<string>()
}

export function UpdatesBell() {
  const [open, setOpen] = useState(false)
  const [activeUpdate, setActiveUpdate] = useState<(typeof releases)[number] | null>(null)
  const [readIds, setReadIds] = useState(readUpdateIds)
  const titleRef = useRef<HTMLHeadingElement>(null)
  const unreadCount = releases.filter(update => !readIds.has(update.id)).length

  useEffect(() => {
    function syncReadIds(event: StorageEvent) {
      if (event.key === READ_UPDATES_KEY || event.key === null) setReadIds(readUpdateIds())
    }
    window.addEventListener('storage', syncReadIds)
    return () => window.removeEventListener('storage', syncReadIds)
  }, [])

  useEffect(() => {
    if (open && activeUpdate) titleRef.current?.focus({ preventScroll: true })
  }, [open, activeUpdate])

  function markRead(ids: string[]) {
    const next = new Set([...readIds, ...readUpdateIds(), ...ids])
    saveSetting(READ_UPDATES_KEY, JSON.stringify([...next]))
    setReadIds(next)
  }

  return <Dialog.Root open={open} onOpenChange={next => {
    if (next) setActiveUpdate(null)
    setOpen(next)
  }}>
    <Dialog.Trigger className="updates-bell" type="button"
      aria-label={unreadCount ? `Уведомления, непрочитанных: ${unreadCount}` : 'Уведомления'}>
      <Bell size={20} aria-hidden="true" />
      {unreadCount > 0 && <span className="updates-count" aria-hidden="true">{unreadCount}</span>}
    </Dialog.Trigger>
    <Dialog.Portal>
      <Dialog.Overlay className="dialog-overlay" />
      <Dialog.Content className="dialog-content updates-dialog" onOpenAutoFocus={event => {
        event.preventDefault()
        titleRef.current?.focus({ preventScroll: true })
      }}>
        <div className="updates-sheet" key={activeUpdate?.id ?? 'all-updates'}>
          <header className="updates-sheet-header">
            <Dialog.Title ref={titleRef} tabIndex={-1} className="updates-sheet-title">
              {activeUpdate ? dateLabel(activeUpdate.date) : 'Уведомления'}
            </Dialog.Title>
            <Dialog.Description className="sr-only">
              {activeUpdate ? 'Подробности обновления MyRSUH' : 'История обновлений MyRSUH'}
            </Dialog.Description>
            {!activeUpdate && unreadCount > 0 && <button type="button" className="updates-read-all"
              onClick={() => { markRead(releases.map(update => update.id)); titleRef.current?.focus() }}>
              Прочитать все
            </button>}
            <Dialog.Close type="button" className="updates-close" aria-label="Закрыть"><X size={19} /></Dialog.Close>
          </header>

          <div className="updates-sheet-body">
            {activeUpdate ? <article className="update-details">
              <p className="update-intro">{activeUpdate.summary}</p>
              {activeUpdate.sections.map(section => <section key={section.title}>
                <h3>{section.title}</h3>
                <ul>{section.items.map((item, index) => <li key={index}>{item}</li>)}</ul>
              </section>)}
            </article> : releases.length > 0 ? <ul className="updates-list">
              {releases.map(update => {
                const unread = !readIds.has(update.id)
                return <li key={update.id}>
                  <button type="button" className={cn('update-row', unread && 'is-unread')} onClick={() => {
                    markRead([update.id])
                    setActiveUpdate(update)
                  }}>
                    <span className="update-emoji" aria-hidden="true">{update.emoji}</span>
                    <span className="update-row-copy">
                      <time dateTime={update.date}>{dateLabel(update.date)}</time>
                      <span>{update.summary}</span>
                      {unread && <span className="sr-only">Непрочитано</span>}
                    </span>
                  </button>
                </li>
              })}
            </ul> : <p className="updates-empty">Обновлений пока нет</p>}
          </div>
        </div>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>
}
