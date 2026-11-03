export const ACCENTS = [
  { id: 'blue', label: 'Голубой' },
  { id: 'green', label: 'Зелёный' },
  { id: 'red', label: 'Красный' },
  { id: 'purple', label: 'Фиолетовый' },
] as const

export type Accent = typeof ACCENTS[number]['id']
export function parseAccent(value: string | null): Accent {
  return ACCENTS.find(accent => accent.id === value)?.id ?? 'blue'
}

export const parseOrganizePast = (value: string | null) => value !== 'false'
