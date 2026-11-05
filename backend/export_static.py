"""Подготовка каталога и расписаний для статического хостинга MyRSUH."""

import argparse
import asyncio
import json
from datetime import datetime
from pathlib import Path
from urllib.parse import quote

import httpx

from app.config.groups import GROUPS
from app.models import Group, Schedule
from app.services.normalize import MOSCOW
from app.services.university_client import fetch_schedule
from app.settings import settings


def schedule_filename(group_id: str) -> str:
    """Кодирует ID в имя файла, совместимое с браузером и Windows."""
    return quote(group_id, safe="").replace("%", "_") + ".json"


def validate_previous(data: dict, group_id: str) -> Schedule:
    """Проверяет принадлежность и допустимый возраст опубликованной копии."""
    saved = Schedule.model_validate(data)
    if saved.group_id != group_id or saved.fetched_at.tzinfo is None:
        raise ValueError("Invalid previous schedule")
    if (datetime.now(MOSCOW) - saved.fetched_at).total_seconds() > settings.max_stale_seconds:
        raise ValueError("Previous schedule is too old")
    return saved.model_copy(update={
        "stale": True,
        "warning": "Не удалось обновить данные. Показано ранее загруженное расписание.",
    })


async def export_schedules(output: Path, previous_url: str | None = None, *, groups=None, fetcher=fetch_schedule):
    """Выгружает все группы, сохраняя последнюю копию при временном сбое РГГУ.

    Одновременно выполняется до трёх запросов. Если хотя бы для одной группы
    нет свежих данных или пригодной копии, экспорт завершается ошибкой до
    записи файлов. GitHub Actions в таком случае сохраняет прежний сайт.
    """
    catalog = GROUPS if groups is None else groups
    if not catalog:
        raise ValueError("Empty group catalog")
    semaphore = asyncio.Semaphore(3)
    async with httpx.AsyncClient(timeout=20, follow_redirects=False) as client:
        async def load(group_id: str):
            async with semaphore:
                for attempt in range(2):
                    try:
                        data = await fetcher(group_id)
                        print(f"{group_id}: updated")
                        return data
                    except Exception:
                        if attempt == 0:
                            await asyncio.sleep(1)
                filename = schedule_filename(group_id)
                try:
                    local = output / "schedules" / filename
                    if local.exists():
                        saved = validate_previous(json.loads(local.read_text(encoding="utf-8")), group_id)
                    elif previous_url:
                        response = await client.get(f"{previous_url.rstrip('/')}/data/schedules/{filename}")
                        response.raise_for_status()
                        saved = validate_previous(response.json(), group_id)
                    else:
                        raise ValueError("No previous schedule")
                    print(f"{group_id}: using previous copy")
                    return saved
                except Exception as exc:
                    raise RuntimeError(f"No usable schedule for {group_id}") from exc

        results = await asyncio.gather(*(load(group_id) for group_id in catalog), return_exceptions=True)
    errors = [str(result) for result in results if isinstance(result, BaseException)]
    if errors:
        raise RuntimeError("; ".join(errors))

    # Все ответы уже получены и проверены, теперь можно собирать новую публикацию.
    schedules = output / "schedules"
    schedules.mkdir(parents=True, exist_ok=True)
    for result in results:
        (schedules / schedule_filename(result.group_id)).write_text(result.model_dump_json(), encoding="utf-8")
    items = [Group.model_validate(group).model_dump(mode="json") for group in catalog.values()]
    (output / "groups.json").write_text(json.dumps(items, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    (output / "config.json").write_text('{"manual_refresh":false}', encoding="utf-8")
    print(f"Exported {len(results)} schedules")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=Path(__file__).resolve().parents[1] / "frontend/public/data")
    parser.add_argument("--previous-url")
    args = parser.parse_args()
    asyncio.run(export_schedules(args.output, args.previous_url))
