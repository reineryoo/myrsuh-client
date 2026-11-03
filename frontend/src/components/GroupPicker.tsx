import { useLayoutEffect, useRef, useState } from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { Check, ChevronDown, ChevronRight, UsersRound } from 'lucide-react'
import type { Group } from '@/types'
import { groupShortName } from '@/config/groups'

export function GroupPicker({ group, savedGroups, onSelect, onManage }:
  { group?: Group; savedGroups: Group[]; onSelect: (id: string) => void; onManage: () => void }) {
  const [open, setOpen] = useState(false)
  const trigger = useRef<HTMLButtonElement>(null)
  const [position, setPosition] = useState<{ top: number; left: number; maxHeight: number } | null>(null)
  useLayoutEffect(() => {
    if (!open) return
    const measure = () => {
      const rect = trigger.current?.getBoundingClientRect()
      if (!rect) return
      const width = Math.min(280, window.innerWidth - 32)
      const top = Math.min(rect.bottom + 10, window.innerHeight - 160)
      setPosition({ top: Math.max(16, top), left: Math.max(16, Math.min(rect.right + 54 - width, window.innerWidth - width - 16)), maxHeight: window.innerHeight - Math.max(16, top) - 16 })
    }
    measure()
    const frame = requestAnimationFrame(measure)
    window.addEventListener('resize', measure)
    return () => { cancelAnimationFrame(frame); window.removeEventListener('resize', measure) }
  }, [open])
  return <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
    <DialogPrimitive.Trigger asChild><button ref={trigger} className="group-pill" aria-label="Выбрать расписание"><span>{groupShortName(group)}</span><ChevronDown size={16} /></button></DialogPrimitive.Trigger>
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="group-picker-backdrop" />
      <DialogPrimitive.Content className="group-popover" style={position ?? { visibility: 'hidden' }}>
        <DialogPrimitive.Title className="group-picker-title">Выберите расписание</DialogPrimitive.Title>
        <DialogPrimitive.Description className="sr-only">Выбери сохранённую группу или открой все расписания.</DialogPrimitive.Description>
        {savedGroups.map(item => {
          const selected = item.id === group?.id
          return <button key={item.id} className="picker-group" aria-current={selected ? 'true' : undefined}
            onClick={() => { onSelect(item.id); setOpen(false) }}>
            <UsersRound size={16} aria-hidden="true" />
            <span><strong>{groupShortName(item)}</strong><small>{item.course} курс</small></span>
            {selected && <Check size={16} aria-hidden="true" />}
          </button>
        })}
        <button className="all-schedules" onClick={() => { setOpen(false); onManage() }}>
          <UsersRound size={16} aria-hidden="true" /><span><strong>Все расписания</strong></span><ChevronRight size={16} aria-hidden="true" />
        </button>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  </DialogPrimitive.Root>
}
