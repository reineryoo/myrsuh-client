import asyncio
import logging
from dataclasses import dataclass
from time import monotonic

from app.models import Schedule
from app.services.university_client import fetch_schedule
from app.settings import settings

logger = logging.getLogger(__name__)


class Unavailable(Exception):
    pass


class RateLimited(Exception):
    def __init__(self, retry_after: int):
        self.retry_after = retry_after


@dataclass
class Entry:
    data: Schedule
    saved_at: float


class ScheduleService:
    def __init__(self, fetcher=fetch_schedule, clock=monotonic):
        self.fetcher = fetcher
        self.clock = clock
        self.cache: dict[str, Entry] = {}
        self.attempts: dict[str, float] = {}
        self.locks: dict[str, asyncio.Lock] = {}

    def fallback(self, group_id: str) -> Schedule:
        """Возвращает сохранённое расписание при недоступности университета.

        Копия помечается как устаревшая, если её возраст ещё допустим.
        При отсутствии подходящей копии сообщает, что данные недоступны.
        """
        entry = self.cache.get(group_id)
        if entry and self.clock() - entry.saved_at <= settings.max_stale_seconds:
            return entry.data.model_copy(update={
                "stale": True,
                "warning": "Не удалось обновить данные. Показано ранее загруженное расписание.",
            })
        raise Unavailable()

    async def get(self, group_id: str, force: bool = False) -> Schedule:
        """Получает расписание из кеша или обновляет его через API РГГУ.

        Блокировка для каждой группы объединяет одновременные обращения.
        Принудительное обновление обходит срок свежести кеша, но сохраняет
        ограничение частоты запросов, включая повторные попытки после ошибки.
        При сбое используется ранее сохранённая копия через fallback.
        """
        async with self.locks.setdefault(group_id, asyncio.Lock()):
            now = self.clock()
            entry = self.cache.get(group_id)
            if not force and entry and now - entry.saved_at < settings.cache_ttl:
                return entry.data
            previous = self.attempts.get(group_id)
            if previous is not None and now - previous < settings.refresh_cooldown:
                if force:
                    raise RateLimited(max(1, int(settings.refresh_cooldown - (now - previous)) + 1))
                return self.fallback(group_id)
            self.attempts[group_id] = now
            try:
                data = await self.fetcher(group_id)
            except Exception as exc:
                logger.warning("University fetch failed (%s)", type(exc).__name__)
                return self.fallback(group_id)
            self.cache[group_id] = Entry(data, self.clock())
            return data
