import os
import ssl
import sys

import httpx

from app.config.groups import GROUPS
from app.config.teachers import SUPPORTED_TEACHER_IDS
from app.models import RawSchedule, RawTeacherSchedule, Schedule, Teacher, TeacherSchedule
from app.services.normalize import normalize, normalize_teacher
from app.settings import settings

UNIVERSITY_URL = "https://raspis.rggu.ru/api/Get_Schedule_Table"
TEACHER_CATALOG_URL = "https://raspis.rggu.ru/api/Get_Teachers_List"


async def fetch_schedule(group_id: str) -> Schedule:
    """Загружает расписание группы из API РГГУ и передаёт его на нормализацию.

    По внутреннему ключу группы выбирает форму обучения, курс и исходный
    идентификатор потока. Ошибки сети, статуса ответа и проверки данных
    передаются сервису кеширования для обработки резервной копии.
    """
    group = GROUPS[group_id]
    payload = {
        "eduform": group["eduform"], "course": str(group["course"]),
        "intervalMode": "4", "menuMode": "flow", "flow": group["upstream_id"],
    }
    raw = RawSchedule.model_validate(await _post_json(UNIVERSITY_URL, payload))
    return normalize(raw, group_id)


async def fetch_teacher_schedule(teacher_id: str) -> TeacherSchedule:
    if teacher_id not in SUPPORTED_TEACHER_IDS:
        raise ValueError("Teacher is not enabled")
    payload = {"intervalMode": "4", "menuMode": "teacher", "teacher": teacher_id}
    raw = RawTeacherSchedule.model_validate(await _post_json(UNIVERSITY_URL, payload))
    return normalize_teacher(raw, teacher_id)


async def fetch_teachers() -> list[Teacher]:
    """Возвращает из справочника РГГУ только разрешённых преподавателей."""
    rows = await _post_json(TEACHER_CATALOG_URL)
    if not isinstance(rows, list):
        raise ValueError("Invalid teacher catalog")
    teachers: dict[str, Teacher] = {}
    for row in rows:
        if not isinstance(row, dict):
            continue
        teacher_id = str(row.get("id"))
        name = row.get("data")
        if teacher_id in SUPPORTED_TEACHER_IDS and isinstance(name, str) and name.strip():
            teachers[teacher_id] = Teacher(id=teacher_id, name=" ".join(name.split()))
    return sorted(teachers.values(), key=lambda teacher: teacher.name.casefold())


async def _post_json(url: str, payload: dict[str, str] | None = None) -> object:
    verify: ssl.SSLContext | bool = True
    if sys.platform == "win32" and not (os.getenv("SSL_CERT_FILE") or os.getenv("SSL_CERT_DIR")):
        import truststore

        # Системная проверка Windows достраивает цепочку, если сервер не прислал промежуточный сертификат.
        verify = truststore.SSLContext(ssl.PROTOCOL_TLS_CLIENT)

    async with httpx.AsyncClient(timeout=settings.upstream_timeout, follow_redirects=False, verify=verify) as client:
        # API РГГУ ожидает поля формы в формате multipart/form-data.
        files = {key: (None, value) for key, value in payload.items()} if payload else None
        response = await client.post(url, files=files)
        response.raise_for_status()
        return response.json()
