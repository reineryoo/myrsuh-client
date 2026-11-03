import { describe, expect, it } from 'vitest'
import { dayState, greeting, orderedDayPairs, timelinePosition } from './day-state'
import { parseSavedGroups } from './storage'
import type { Lesson } from '@/types'

export const entries: Lesson[] = [
  { id:'a', pair:5, start:'15:35', end:'16:55', subject:'Предмет А', lesson_type:'лек; сем', room:'114', teacher:null, teacher_full:null, group:null, subgroup:null, source:{} },
  { id:'parallel', pair:5, start:'15:35', end:'16:55', subject:'Предмет Б', lesson_type:'лек', room:null, teacher:null, teacher_full:null, group:null, subgroup:'2', source:{} },
  { id:'b', pair:6, start:'17:05', end:'18:25', subject:'Предмет В', lesson_type:'сем', room:'210', teacher:null, teacher_full:null, group:null, subgroup:null, source:{} },
]
const day = '2026-11-03'

describe('actual daily states', () => {
  it('shows the first pair before classes begin, preserving simultaneous entries', () => {
    const value = dayState(entries, day, {date:day,time:'14:00'})
    expect(value.state).toBe('before')
    expect(value.focus?.[0]).toBe(5)
    expect(value.focus?.[1]).toHaveLength(2)
    expect(value.pairs).toHaveLength(2)
  })
  it('uses exact start and end times for the current pair', () => {
    expect(dayState(entries,day,{date:day,time:'15:35'}).state).toBe('current')
    const gap = dayState(entries,day,{date:day,time:'16:55'})
    expect(gap.state).toBe('break')
    expect(gap.focus?.[0]).toBe(6)
    expect(gap.past).toHaveLength(1)
    expect(dayState(entries,day,{date:day,time:'18:25'}).state).toBe('finished')
  })
  it('distinguishes no lessons, future dates and completed days', () => {
    expect(dayState([],day,{date:day,time:'12:00'}).state).toBe('empty')
    expect(dayState(entries,day,{date:'2026-11-02',time:'23:00'}).state).toBe('before')
    expect(dayState(entries,day,{date:'2026-11-04',time:'01:00'}).state).toBe('finished')
  })
  it('greets the student for the current Moscow part of the day', () => {
    expect(['06:00','13:00','20:00','01:00'].map(greeting)).toEqual(['Доброе утро','Добрый день','Добрый вечер','Доброй ночи'])
  })
})

describe('moving timeline', () => {
  const slots = [{start:'15:35',end:'16:55',top:24,height:160},{start:'17:05',end:'18:25',top:244,height:160}]
  it('moves through a lesson based on real elapsed time', () => {
    expect(timelinePosition(slots,{date:day,time:'15:35'})).toBe(24)
    expect(timelinePosition(slots,{date:day,time:'16:15'})).toBe(104)
    expect(timelinePosition(slots,{date:day,time:'16:15',second:30})).toBe(105)
  })
  it('crosses the measured break and enters the next pair', () => {
    expect(timelinePosition(slots,{date:day,time:'16:55'})).toBe(184)
    expect(timelinePosition(slots,{date:day,time:'17:00'})).toBe(214)
    expect(timelinePosition(slots,{date:day,time:'17:05'})).toBe(244)
  })
  it('stays above the first pair before classes and disappears after the last', () => {
    expect(timelinePosition(slots,{date:day,time:'08:00'})).toBe(12)
    expect(timelinePosition(slots,{date:day,time:'18:25'})).toBeNull()
    expect(timelinePosition([],{date:day,time:'12:00'})).toBeNull()
  })
})

describe('saved schedules', () => {
  it('accepts only unique non-empty identifiers and handles corrupted storage', () => {
    expect(parseSavedGroups('["119_1","119_1",null,12,""]')).toEqual(['119_1'])
    expect(parseSavedGroups('invalid')).toEqual([])
    expect(parseSavedGroups('{"id":"119_1"}')).toEqual([])
  })
})

describe('past-lesson organization', () => {
  it('keeps active pairs first and past pairs last without losing parallel flows', () => {
    const ordered = orderedDayPairs(entries,day,{date:day,time:'17:10'},true)
    expect(ordered.map(([pair]) => pair)).toEqual([6,5])
    expect(ordered[1][1]).toHaveLength(2)
  })
  it('preserves the original chronological order when disabled', () => {
    expect(orderedDayPairs(entries,day,{date:day,time:'17:10'},false).map(([pair])=>pair)).toEqual([5,6])
  })
})
