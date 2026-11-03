import { useLayoutEffect, useRef, useState } from 'react'
import { CalendarDays, Home, SlidersHorizontal } from 'lucide-react'
import { cn } from '@/lib/utils'

export type NavigationTab = 'home' | 'calendar' | 'settings'
const destinations = [
  { id: 'home', label: 'Главная', Icon: Home },
  { id: 'calendar', label: 'Календарь', Icon: CalendarDays },
  { id: 'settings', label: 'Настройки', Icon: SlidersHorizontal },
] as const

export function BottomNav({ active, onSelect }: { active: NavigationTab; onSelect: (tab: NavigationTab) => void }) {
  const nav = useRef<HTMLElement>(null)
  const [indicator, setIndicator] = useState<{ x: number; y: number; width: number; height: number } | null>(null)

  useLayoutEffect(() => {
    const element = nav.current
    if (!element) return
    let disposed = false
    const measure = () => {
      if (disposed) return
      const button = element.querySelector<HTMLButtonElement>('[aria-current="page"]')
      if (!button) return
      const next = { x: button.offsetLeft, y: button.offsetTop, width: button.offsetWidth, height: button.offsetHeight }
      setIndicator(previous => previous && previous.x === next.x && previous.y === next.y && previous.width === next.width && previous.height === next.height ? previous : next)
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    element.querySelectorAll('button').forEach(button => observer.observe(button))
    void document.fonts.ready.then(measure)
    return () => { disposed = true; observer.disconnect() }
  }, [active])

  return <nav ref={nav} className="bottom-nav" aria-label="Основная навигация">
    {indicator && <span className="nav-indicator" aria-hidden="true" style={{ width: indicator.width, height: indicator.height, transform: `translate3d(${indicator.x}px, ${indicator.y}px, 0)` }} />}
    {destinations.map(({ id, label, Icon }) => <button key={id} onClick={() => onSelect(id)} aria-label={label} aria-current={active === id ? 'page' : undefined} className={cn(active === id && 'active')}>
      <Icon size={23} /><span>{label}</span>
    </button>)}
  </nav>
}
