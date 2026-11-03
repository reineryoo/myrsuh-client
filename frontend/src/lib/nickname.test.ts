import { describe, expect, it } from 'vitest'
import { displayNickname, nicknameInitial, NICKNAME_MAX_LENGTH, sanitizeNickname } from './nickname'

describe('local nickname', () => {
  it('keeps names, nickname punctuation, digits and composed accents', () => {
    expect(sanitizeNickname("Анна-Мария O'Connor_42. Reiner")).toBe("Анна-Мария O'Connor_42. Reiner")
    expect(sanitizeNickname('Cafe\u0301')).toBe('Café')
    expect(sanitizeNickname('Анна\nМария')).toBe('Анна Мария')
  })
  it('removes emoji, flags, skin tones, joined sequences and keycaps without stripping ordinary digits', () => {
    expect(sanitizeNickname('🔥Reiner🙂🇷🇺👨‍💻👍🏽❤️1️⃣#️⃣*️⃣42')).toBe('Reiner42')
    expect(displayNickname('🙂')).toBe('Студент')
    expect(sanitizeNickname('a\u200db\u202ec')).toBe('abc')
  })
  it('uses the first name character, with Student as the empty fallback', () => {
    expect(displayNickname(null)).toBe('Студент')
    expect(displayNickname('  ')).toBe('Студент')
    expect(displayNickname(' анна ')).toBe('анна')
    expect(nicknameInitial(' анна ')).toBe('А')
    expect(nicknameInitial('reiner')).toBe('R')
    expect(nicknameInitial('42name')).toBe('4')
    expect(nicknameInitial('')).toBe('С')
  })
  it('bounds stored names while retaining an editable trailing space', () => {
    expect(sanitizeNickname('а'.repeat(100))).toHaveLength(NICKNAME_MAX_LENGTH)
    expect(sanitizeNickname('Анна ')).toBe('Анна ')
  })
})
