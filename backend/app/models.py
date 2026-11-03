from datetime import date, datetime
from pydantic import BaseModel, ConfigDict, Field


class Group(BaseModel):
    id: str
    university: str
    institute: str
    direction: str
    profile: str
    course: int
    group: str
    education: str
    flow: str
    eduform: str
    label: str


class RawFlow(BaseModel):
    model_config = ConfigDict(extra="allow", coerce_numbers_to_str=True)
    group: str | None = None
    subgroup: str | None = None
    subject: str | None = None
    teacher: str | None = None
    teacher_fullfio: str | None = None
    room: str | None = None
    lessontype: str | None = None
    id_room: str | None = None
    id_subject: str | None = None
    id_teacher: str | None = None
    id_lessontype: str | None = None


class RawPair(BaseModel):
    pair: int = Field(ge=1, le=8)
    flows: list[RawFlow]


class RawDay(BaseModel):
    date: str
    pairs: list[RawPair]


class RawSchedule(BaseModel):
    interval: str
    tblData: list[RawDay]
    item: str = ""
    edYear: str | None = None
    semester: str | None = None
    updatetime: str | None = None


class Lesson(BaseModel):
    id: str
    pair: int
    start: str
    end: str
    subject: str
    room: str | None
    teacher: str | None
    teacher_full: str | None
    lesson_type: str | None
    group: str | None
    subgroup: str | None
    source: RawFlow


class Day(BaseModel):
    date: date
    lessons: list[Lesson]


class Schedule(BaseModel):
    group_id: str
    period_start: date
    period_end: date
    days: list[Day]
    bells: dict[int, tuple[str, str]]
    academic_year: str | None
    semester: str | None
    university_updated_at: datetime | None
    fetched_at: datetime
    stale: bool = False
    warning: str | None = None
    timezone: str = "Europe/Moscow"
