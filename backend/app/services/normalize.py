import re
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from app.config.bells import BELLS
from app.models import Day, Lesson, RawSchedule, Schedule

MOSCOW = ZoneInfo("Europe/Moscow")


def clean(value: str | None) -> str | None:
    text = value.strip() if value else ""
    return text if text not in {"", "-", "—"} else None


def normalize(raw: RawSchedule, group_id: str) -> Schedule:
    """Преобразует ответ РГГУ в единый формат расписания приложения.

    Проверяет границы периода, сохраняет все одновременные занятия и добавляет
    дни без пар. Время занятий берётся из расписания звонков, а отметки
    обновления и получения данных записываются по московскому времени.
    """
    dates = re.findall(r"\d{2}\.\d{2}\.\d{4}", raw.interval)
    if len(dates) != 2:
        raise ValueError("Upstream returned no explicit period")
    start, end = [datetime.strptime(value, "%d.%m.%Y").date() for value in dates]
    if end < start or (end - start).days > 400:
        raise ValueError("Invalid upstream period")
    by_date: dict = {}
    for day in raw.tblData:
        day_date = datetime.strptime(day.date[:10], "%d.%m.%Y").date()
        if not start <= day_date <= end:
            raise ValueError("Lesson outside upstream period")
        lessons = by_date.setdefault(day_date, [])
        for pair in day.pairs:
            for flow in pair.flows:
                lessons.append(Lesson(
                    id=f"{day_date}-{pair.pair}-{len(lessons)}",
                    pair=pair.pair, start=BELLS[pair.pair][0], end=BELLS[pair.pair][1],
                    subject=clean(flow.subject) or "Дисциплина не указана",
                    room=clean(flow.room), teacher=clean(flow.teacher),
                    teacher_full=clean(flow.teacher_fullfio), lesson_type=clean(flow.lessontype),
                    group=clean(flow.group), subgroup=clean(flow.subgroup), source=flow,
                ))
    days = [Day(date=start + timedelta(days=i), lessons=sorted(
        by_date.get(start + timedelta(days=i), []), key=lambda lesson: lesson.pair
    )) for i in range((end - start).days + 1)]
    updated = None
    if raw.updatetime:
        try:
            updated = datetime.strptime(raw.updatetime, "%d.%m.%Y %H:%M").replace(tzinfo=MOSCOW)
        except ValueError:
            pass
    return Schedule(
        group_id=group_id, period_start=start, period_end=end, days=days, bells=BELLS,
        academic_year=raw.edYear, semester=raw.semester,
        university_updated_at=updated, fetched_at=datetime.now(MOSCOW),
    )
