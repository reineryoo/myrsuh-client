import { Check, Moon, Sun } from 'lucide-react'
import { ACCENTS } from '@/config/preferences'
import type { Accent } from '@/config/preferences'
import { NICKNAME_MAX_LENGTH, sanitizeNickname } from '@/lib/nickname'
import { cn } from '@/lib/utils'

export function NicknameField({ value, onChange }: { value: string; onChange?: (value: string) => void }) {
  return <><h2><label htmlFor="nickname">Имя или никнейм</label></h2><input id="nickname" type="text" value={value} placeholder="Студент" autoComplete="nickname" maxLength={NICKNAME_MAX_LENGTH} aria-describedby="nickname-help" onChange={event => onChange?.(sanitizeNickname(event.target.value))} /><p id="nickname-help" className="settings-help">Можно не заполнять — будем обращаться «Студент». До {NICKNAME_MAX_LENGTH} символов, без эмодзи.</p></>
}
export function ThemeOptions({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return <div className="theme-options"><button type="button" aria-pressed={value === 'dark'} className={cn(value === 'dark' && 'selected')} onClick={() => onChange('dark')}><span className="theme-preview dark-preview" aria-hidden="true"><i /><i /><i /></span><Moon size={20} />Тёмная{value === 'dark' && <Check size={16} />}</button><button type="button" aria-pressed={value === 'light'} className={cn(value === 'light' && 'selected')} onClick={() => onChange('light')}><span className="theme-preview light-preview" aria-hidden="true"><i /><i /><i /></span><Sun size={20} />Светлая{value === 'light' && <Check size={16} />}</button></div>
}
export function AccentOptions({ value, onChange }: { value: Accent; onChange?: (value: Accent) => void }) {
  return <div className="accent-options" aria-label="Акцентный цвет">{ACCENTS.map(item => <button type="button" className={cn('accent-option', item.id, value === item.id && 'selected')} key={item.id} aria-label={item.label} aria-pressed={value === item.id} onClick={() => onChange?.(item.id)}><span className="accent-swatch">{value === item.id && <Check size={16} />}</span><span>{item.label}</span></button>)}</div>
}
