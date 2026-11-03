import httpx

from app.config.groups import GROUPS
from app.models import RawSchedule
from app.services.normalize import normalize
from app.settings import settings

UNIVERSITY_URL = "https://raspis.rggu.ru/api/Get_Schedule_Table"


async def fetch_schedule(group_id: str):
    group = GROUPS[group_id]
    payload = {
        "eduform": group["eduform"], "course": str(group["course"]),
        "intervalMode": "4", "menuMode": "flow", "flow": group["upstream_id"],
    }
    async with httpx.AsyncClient(timeout=settings.upstream_timeout, follow_redirects=False) as client:
        response = await client.post(
            UNIVERSITY_URL, files={key: (None, value) for key, value in payload.items()}
        )
        response.raise_for_status()
        return normalize(RawSchedule.model_validate(response.json()), group_id)
