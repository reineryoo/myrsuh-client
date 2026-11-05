import httpx

from app.config.groups import GROUPS
from app.models import RawSchedule
from app.services.normalize import normalize
from app.settings import settings

UNIVERSITY_URL = "https://raspis.rggu.ru/api/Get_Schedule_Table"


async def fetch_schedule(group_id: str):
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
    async with httpx.AsyncClient(timeout=settings.upstream_timeout, follow_redirects=False) as client:
        # API РГГУ ожидает поля формы в формате multipart/form-data.
        response = await client.post(
            UNIVERSITY_URL, files={key: (None, value) for key, value in payload.items()}
        )
        response.raise_for_status()
        return normalize(RawSchedule.model_validate(response.json()), group_id)
