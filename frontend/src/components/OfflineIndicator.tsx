import { useLayoutEffect, useRef, useState } from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'

export function OfflineIndicator() {
  const [open, setOpen] = useState(false)
  const trigger = useRef<HTMLButtonElement>(null)
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null)

  useLayoutEffect(() => {
    if (!open) return
    const measure = () => {
      const rect = trigger.current?.getBoundingClientRect()
      if (!rect) return
      const width = Math.min(320, window.innerWidth - 32)
      setPosition({
        top: Math.max(16, Math.min(rect.bottom + 14, window.innerHeight - 160)),
        left: Math.max(16, Math.min(rect.left - 20, window.innerWidth - width - 16)),
      })
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [open])

  return <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
    <DialogPrimitive.Trigger asChild>
      <button ref={trigger} className="offline-indicator" type="button" aria-label="Нет подключения к интернету">
        <span aria-hidden="true">!</span>
      </button>
    </DialogPrimitive.Trigger>
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="offline-warning-overlay" onClick={() => setOpen(false)} />
      <DialogPrimitive.Content className="offline-warning-content" style={position ?? { visibility: 'hidden' }} onClick={() => setOpen(false)}>
        <DialogPrimitive.Title>Нет подключения к интернету</DialogPrimitive.Title>
        <DialogPrimitive.Description>Показано сохранённое расписание. Для загрузки свежих данных и поиска новых групп потребуется интернет.</DialogPrimitive.Description>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  </DialogPrimitive.Root>
}
