import os
import ssl
import sys

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
    verify: ssl.SSLContext | bool = True
    if sys.platform == "win32" and not (os.getenv("SSL_CERT_FILE") or os.getenv("SSL_CERT_DIR")):
        import truststore

        # Системная проверка Windows достраивает цепочку, если сервер не прислал промежуточный сертификат.
        verify = truststore.SSLContext(ssl.PROTOCOL_TLS_CLIENT)

    async with httpx.AsyncClient(timeout=settings.upstream_timeout, follow_redirects=False, verify=verify) as client:
        # API РГГУ ожидает поля формы в формате multipart/form-data.
        response = await client.post(
            UNIVERSITY_URL, files={key: (None, value) for key, value in payload.items()}
        )
        response.raise_for_status()
        return normalize(RawSchedule.model_validate(response.json()), group_id)
