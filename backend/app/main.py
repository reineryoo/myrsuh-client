import logging

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

from app.config.groups import GROUPS
from app.models import Group, Schedule
from app.services.schedule_service import RateLimited, ScheduleService, Unavailable
from app.settings import settings

logging.basicConfig(level=logging.INFO)
service = ScheduleService()


app = FastAPI(title="MyRSUH")
app.add_middleware(CORSMiddleware, allow_origins=settings.cors_origins,
                   allow_methods=["GET", "POST"], allow_headers=["Content-Type"])


@app.get("/api/health")
async def health():
    return {"status": "ok", "timezone": "Europe/Moscow"}


@app.get("/api/config")
async def config():
    return {"manual_refresh": settings.allow_manual_refresh}


@app.get("/api/groups", response_model=list[Group])
async def groups():
    return [Group.model_validate(group) for group in GROUPS.values()]


async def get_schedule(group_id: str, force: bool = False):
    """Проверяет группу и преобразует ошибки сервиса в HTTP-ответы API.

    При ограничении частоты передаёт клиенту время ожидания в Retry-After.
    При недоступности данных возвращает общее сообщение об ошибке.
    """
    if group_id not in GROUPS:
        raise HTTPException(404, "Группа не найдена")
    try:
        return await service.get(group_id, force)
    except RateLimited as exc:
        raise HTTPException(429, f"Повторите обновление через {exc.retry_after} с.",
                            headers={"Retry-After": str(exc.retry_after)}) from None
    except Unavailable:
        raise HTTPException(503, "Не удалось загрузить расписание. Попробуйте ещё раз") from None


@app.get("/api/schedule", response_model=Schedule)
async def schedule(group_id: str = Query(default="119_1", max_length=32)):
    return await get_schedule(group_id)


@app.post("/api/schedule/refresh", response_model=Schedule)
async def refresh(group_id: str = Query(default="119_1", max_length=32)):
    if not settings.allow_manual_refresh:
        raise HTTPException(403, "Ручное обновление расписания отключено")
    return await get_schedule(group_id, force=True)
