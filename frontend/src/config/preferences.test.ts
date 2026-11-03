import { describe, expect, it } from 'vitest'
import { ACCENTS, parseAccent, parseOrganizePast } from './preferences'

describe('saved display preferences', () => {
  it('accepts four accents and falls back to blue for unknown values', () => {
    expect(ACCENTS.map(item => parseAccent(item.id))).toEqual(['blue','green','red','purple'])
    expect(parseAccent('orange')).toBe('blue')
    expect(parseAccent(null)).toBe('blue')
  })
  it('enables past-lesson organization by default and restores an explicit opt-out', () => {
    expect(parseOrganizePast(null)).toBe(true)
    expect(parseOrganizePast('true')).toBe(true)
    expect(parseOrganizePast('false')).toBe(false)
  })
})
