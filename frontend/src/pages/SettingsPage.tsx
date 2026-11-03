import { ExternalLink, RefreshCw, RotateCcw, Smartphone, Timer } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatTimestamp } from '@/lib/dates'
import { cn } from '@/lib/utils'
import type { Schedule } from '@/types'
import type { Accent } from '@/config/preferences'
import { AccentOptions, NicknameField, ThemeOptions } from '@/components/PreferencesFields'

export function SettingsPage({ theme, onTheme, data, onReset, onRefresh, refreshing, cooldown, accent = 'blue', onAccent, organizePast = true, onOrganizePast, nickname = '', onNickname }:
  { theme: string; onTheme: (theme: string) => void; data?: Schedule; onReset: () => void; onRefresh?: () => void; refreshing: boolean; cooldown: boolean;
    accent?: Accent; onAccent?: (accent: Accent) => void; organizePast?: boolean; onOrganizePast?: (value: boolean) => void; nickname?: string; onNickname?: (value: string) => void }) {
  return <section className="settings-page"><div className="page-title"><h1>Настройки</h1><p>Чтобы всё было по-твоему.</p></div>
    <section className="surface-panel settings-card nickname-settings"><NicknameField value={nickname} onChange={onNickname} /></section>
    <section className="surface-panel settings-card appearance-settings">
      <h2>Оформление</h2>
      <ThemeOptions value={theme} onChange={onTheme} />
    </section>
    <section className="surface-panel settings-card"><h2>Акцентный цвет</h2><AccentOptions value={accent} onChange={onAccent} /><p className="settings-help">Мягкие оттенки для кнопок и выделений. Цвета типов занятий сохраняются.</p></section>
    <section className="surface-panel settings-card"><div className="setting-switch-row"><div><h2 id="organize-past-label">Прошедшие пары вниз</h2><p id="organize-past-description">Активные пары сверху, прошедшие — серыми ниже.</p></div><button className="setting-switch" role="switch" aria-checked={organizePast} aria-labelledby="organize-past-label" aria-describedby="organize-past-description" onClick={() => onOrganizePast?.(!organizePast)}><span /></button></div><p className="settings-help">Если выключить, пары остаются в хронологическом порядке и сохраняют свои цвета. Ни одна пара не скрывается.</p></section>
    <section className="surface-panel settings-card bell-settings">
      <h2><Timer size={16} aria-hidden="true" />Расписание звонков <small>МСК</small></h2>
      {data ? <ol className="bell-list">
        {Object.entries(data.bells).map(([pair, [start, end]]) => (
          <li key={pair}>
            <strong aria-label={`${pair}-я пара`}>{pair}</strong>
            <span><time dateTime={start}>{start}</time>–<time dateTime={end}>{end}</time></span>
          </li>
        ))}
      </ol> : <p className="section-caption">Звонки появятся после загрузки расписания.</p>}
    </section>
    <section className="surface-panel settings-card update-settings">
      <h2>Данные расписания</h2>
      <p>Университет: {formatTimestamp(data?.university_updated_at ?? null)}</p>
      <p>Получено: {formatTimestamp(data?.fetched_at ?? null)}</p>
      {onRefresh && <>
        <Button variant="outline" onClick={onRefresh} disabled={refreshing || cooldown}>
          <RefreshCw size={15} className={cn(refreshing && 'spin')} />
          {refreshing ? 'Обновляем' : 'Обновить расписание'}
        </Button>
        {cooldown && <p className="settings-help">Повторное обновление доступно через минуту.</p>}
      </>}
    </section>
    <section className="surface-panel settings-card install-card"><h2><Smartphone size={18} />На экран iPhone</h2><p>Открывай расписание с домашнего экрана, как отдельное приложение.</p><ol><li>Открой сайт в Safari.</li><li>Нажми «Поделиться» → «На экран “Домой”».</li><li>Включи «Открывать как веб-приложение», если есть этот переключатель, и нажми «Добавить».</li></ol><p className="settings-help">При локальном запуске компьютер должен быть включён, а телефон — в той же сети. Без подключения расписание не загрузится.</p><a href="https://support.apple.com/guide/iphone/iphea86e5236/ios" target="_blank" rel="noreferrer">Инструкция Apple <ExternalLink size={12} /></a></section>
    <section className="settings-reset"><p>Сброс удалит имя, сохранённые группы и оформление только в этом браузере.</p><Button variant="ghost" className="reset-data-button" onClick={onReset}><RotateCcw size={15} />Сбросить локальные данные</Button></section>
  </section>
}
