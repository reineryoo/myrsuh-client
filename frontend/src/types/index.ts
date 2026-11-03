export interface Group {
  id: string; university: string; institute: string; direction: string; profile: string;
  course: number; group: string; education: string; flow: string
  eduform?: string; label?: string
}
export interface Lesson {
  id: string; pair: number; start: string; end: string; subject: string;
  room: string | null; teacher: string | null; teacher_full: string | null;
  lesson_type: string | null; group: string | null; subgroup: string | null;
  source: Record<string, unknown>
}
export interface Day { date: string; lessons: Lesson[] }
export interface Schedule {
  group_id: string; period_start: string; period_end: string; days: Day[];
  bells: Record<string, [string, string]>; academic_year: string | null; semester: string | null;
  university_updated_at: string | null; fetched_at: string; stale: boolean; warning: string | null
  offline?: boolean
}
