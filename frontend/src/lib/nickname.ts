export const NICKNAME_MAX_LENGTH = 64

// An allowlist also removes emoji joiners, variation selectors and invisible controls.
export function sanitizeNickname(value: string | null) {
  const text = (value ?? '').normalize('NFC')
    .replace(/[#*0-9]\uFE0F?\u20E3/gu, '')
    .replace(/\s+/gu, ' ')
    .replace(/[^\p{L}\p{N} ._'’\-]/gu, '')
  return Array.from(text).slice(0, NICKNAME_MAX_LENGTH).join('')
}

export const displayNickname = (value: string | null) => sanitizeNickname(value).trim() || 'Студент'
export const nicknameInitial = (value: string | null) => Array.from(Array.from(displayNickname(value))[0].toLocaleUpperCase('ru-RU'))[0]
