import type { Lesson } from '@/types'
import type { MoscowClock } from './dates'
import { groupPairs } from './lessons'

export function greeting(time: string) {
  const hour = Number(time.slice(0, 2))
  return hour >= 5 && hour < 12 ? 'Доброе утро' : hour >= 12 && hour < 18 ? 'Добрый день' : hour >= 18 && hour < 23 ? 'Добрый вечер' : 'Доброй ночи'
}

export function dayState(lessons: Lesson[], day: string, now: MoscowClock) {
  const pairs = groupPairs(lessons)
  const current = day === now.date ? pairs.find(([, entries]) => entries[0].start <= now.time && entries[0].end > now.time) : undefined
  const upcoming = pairs.filter(([, entries]) => day > now.date || day === now.date && entries[0].start > now.time)
  const past = pairs.filter(([, entries]) => day < now.date || day === now.date && entries[0].end <= now.time)
  const state = !pairs.length ? 'empty' : current ? 'current' : !upcoming.length ? 'finished' : past.length ? 'break' : 'before'
  return { state, pairs, current, upcoming, past, focus: current ?? upcoming[0] }
}

export function orderedDayPairs(lessons: Lesson[], day: string, now: MoscowClock, organizePast: boolean) {
  const state = dayState(lessons, day, now)
  return organizePast ? [...(state.current ? [state.current] : []), ...state.upcoming, ...state.past] : state.pairs
}

export interface TimelineSlot { start: string; end: string; top: number; height: number }
const minutes = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3))

/** Map Moscow time to measured card positions, including real breaks. */
export function timelinePosition(slots: TimelineSlot[], now: MoscowClock): number | null {
  if (!slots.length) return null
  const time = minutes(now.time) + (now.second ?? 0) / 60
  if (time >= minutes(slots.at(-1)!.end)) return null
  if (time < minutes(slots[0].start)) return Math.max(0, slots[0].top - 12)
  for (let i = 0; i < slots.length; i++) {
    const slot = slots[i]
    if (time >= minutes(slot.start) && time < minutes(slot.end)) {
      return slot.top + slot.height * (time - minutes(slot.start)) / (minutes(slot.end) - minutes(slot.start))
    }
    const next = slots[i + 1]
    if (next && time >= minutes(slot.end) && time < minutes(next.start)) {
      return slot.top + slot.height + (next.top - slot.top - slot.height) * (time - minutes(slot.end)) / (minutes(next.start) - minutes(slot.end))
    }
  }
  return null
}
