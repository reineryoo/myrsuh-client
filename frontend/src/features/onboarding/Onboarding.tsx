import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, CalendarDays, Check, SlidersHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Logo } from '@/components/Logo'
import { AccentOptions, NicknameField, ThemeOptions } from '@/components/PreferencesFields'
import { groupShortName } from '@/config/groups'
import type { Accent } from '@/config/preferences'
import { GroupCatalog, GroupDetails } from '@/components/GroupCatalog'
import { cn } from '@/lib/utils'
import type { Group } from '@/types'

export function Onboarding({ groups, loading, error, offline, onRetry, onSelect, nickname, onNickname, theme, onTheme, accent, onAccent }:
  { groups: Group[]; loading: boolean; error: boolean; offline?: boolean; onRetry: () => void; onSelect: (id: string) => void;
    nickname: string; onNickname: (value: string) => void; theme: string; onTheme: (value: string) => void; accent: Accent; onAccent: (value: Accent) => void }) {
  const [step, setStep] = useState(0)
  const [direction, setDirection] = useState<'forward' | 'back'>('forward')
  const [selection, setSelection] = useState('')
  const [query, setQuery] = useState('')
  const heading = useRef<HTMLHeadingElement>(null)
  const selected = groups.find(group => group.id === selection)

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' })
    heading.current?.focus({ preventScroll: true })
  }, [step])

  function go(next: number) { setDirection(next > step ? 'forward' : 'back'); setStep(next) }
  function next() {
    if (step === 0) go(1)
    else if (selected && step === 1) go(2)
    else if (selected && step === 2) onSelect(selected.id)
  }

  return <div className={`onboarding onboarding-wizard wizard-step-${step}`}>
    <header className="onboarding-header">{step === 0 ? <Logo /> : <button type="button" className="circle-button" aria-label="Назад" onClick={() => go(step - 1)}><ArrowLeft size={20} /></button>}
      <div className="onboarding-steps" aria-label={`Шаг ${step + 1} из 3`}>{[0, 1, 2].map(index => <span key={index} className={cn(index === step && 'active', index < step && 'complete')} aria-current={index === step ? 'step' : undefined} />)}</div>
    </header>
    <form className="onboarding-form" onSubmit={event => { event.preventDefault(); next() }}>
      <main className={cn('onboarding-step', `step-${step}`, `step-${direction}`)} key={step}>
        {step === 0 ? <>
          <div className="onboarding-preview"><img src="/images/onboarding-schedule.jpg" alt="Наше расписание РГГУ: дни недели, время пар, аудитории и преподаватели" width="545" height="465" fetchPriority="high" draggable={false} /></div>
          <div className="onboarding-intro"><h1 ref={heading} tabIndex={-1}>Все пары.<br /><span>Всё под рукой.</span></h1><p>Удобное и наглядное расписание РГГУ: пары, аудитории и преподаватели — в одном месте.</p></div>
        </> : step === 1 ? <>
          <span className="onboarding-step-icon"><CalendarDays size={27} /></span>
          <h1 ref={heading} tabIndex={-1}>Твоя группа</h1><p className="onboarding-description">Найди свою группу — расписание подтянется автоматически. Позже её можно изменить в календаре.</p>
          <section className="onboarding-group-panel surface-panel">
            {loading ? <div className="onboarding-group-state" role="status">Загружаем группы…</div>
              : error ? <div className="inline-error" role="alert">Не удалось загрузить группы.<Button type="button" variant="outline" onClick={onRetry}>Повторить</Button></div>
              : <GroupCatalog offline={offline} groups={groups} query={query} onQuery={setQuery} renderGroup={group => (
                <button type="button" key={group.id} aria-pressed={selection === group.id}
                  className={cn('onboarding-group-option', selection === group.id && 'selected')} onClick={() => setSelection(group.id)}>
                  <span><GroupDetails group={group} /></span>
                  <span className="group-selection-check">{selection === group.id && <Check size={17} />}</span>
                </button>
              )} />}
          </section>
          {selected && <p className="onboarding-group-note" role="status">Выбрана группа {groupShortName(selected)} · {selected.course} курс · {selected.education}</p>}
        </> : <>
          <span className="onboarding-step-icon"><SlidersHorizontal size={26} /></span><h1 ref={heading} tabIndex={-1}>Пара настроек</h1><p className="onboarding-description">Всё можно поменять позже.</p>
          <section className="surface-panel settings-card nickname-settings"><NicknameField value={nickname} onChange={onNickname} /></section>
          <section className="surface-panel settings-card onboarding-theme"><h2>Тема</h2><ThemeOptions value={theme} onChange={onTheme} /></section>
          <section className="surface-panel settings-card"><h2>Акцентный цвет</h2><AccentOptions value={accent} onChange={onAccent} /></section>
        </>}
      </main>
      <div className="onboarding-bottom"><Button type="submit" disabled={step > 0 && (!selected || loading || error)} className="onboarding-next">{step === 2 ? 'Готово' : 'Далее'}<ArrowRight size={20} /></Button><p>Без регистрации. Настройки остаются в этом браузере.</p></div>
    </form>
  </div>
}
