import asyncio
from datetime import date
from unittest.mock import AsyncMock

import httpx
import pytest
from pydantic import ValidationError

from app.config.bells import BELLS
from app.models import RawSchedule
from app.services.normalize import normalize
from app.services.schedule_service import RateLimited, ScheduleService, Unavailable
from app.settings import settings


@pytest.fixture
def raw():
    return {"interval": "с 31.12.2026 по 02.01.2027", "updatetime": "01.11.2026 22:00",
            "tblData": [{"date": "31.12.2026 ЧТ", "pairs": [{"pair": 5, "flows": [
                {"subject": "Тестовая дисциплина", "lessontype": "лек; сем", "id_subject": "42", "id_room": 45},
                {"subject": "Подгруппа", "subgroup": "2", "room": "-", "teacher": None},
            ]}, {"pair": 6, "flows": [{"subject": "Тестовая дисциплина"}]}]}]}


def test_normalization_retains_flows_ids_and_pairs(raw):
    result = normalize(RawSchedule.model_validate(raw), "119_1")
    assert [day.date for day in result.days] == [date(2026, 12, 31), date(2027, 1, 1), date(2027, 1, 2)]
    lessons = result.days[0].lessons
    assert [lesson.pair for lesson in lessons] == [5, 5, 6]
    assert lessons[0].source.id_subject == "42"
    assert lessons[0].source.id_room == "45"
    assert lessons[0].lesson_type == "лек; сем"
    assert lessons[1].room is None and lessons[1].teacher is None
    assert result.days[1].lessons == []
    assert str(result.university_updated_at.utcoffset()) == "3:00:00"
    assert len({lesson.id for lesson in lessons}) == 3


@pytest.mark.parametrize("pair,start,end", [(1,"08:45","10:05"),(2,"10:15","11:35"),
    (3,"12:10","13:30"),(4,"13:40","15:00"),(5,"15:35","16:55"),
    (6,"17:05","18:25"),(7,"18:50","20:10"),(8,"20:20","21:40")])
def test_all_bells(raw, pair, start, end):
    raw["tblData"][0]["pairs"] = [{"pair": pair, "flows": [{"subject": "Проверка времени"}]}]
    lesson = normalize(RawSchedule.model_validate(raw), "119_1").days[0].lessons[0]
    assert (lesson.start, lesson.end) == (start, end) == BELLS[pair]


def test_empty_semester_has_all_days(raw):
    raw["tblData"] = []
    result = normalize(RawSchedule.model_validate(raw), "119_1")
    assert len(result.days) == 3
    assert all(not day.lessons for day in result.days)


def test_whitespace_fields_are_treated_as_missing(raw):
    raw["tblData"][0]["pairs"] = [{"pair": 1, "flows": [{
        "subject": "   ", "teacher": "\t", "teacher_fullfio": "  ",
        "room": "\n", "lessontype": "  ", "group": " ", "subgroup": " ",
    }]}]
    lesson = normalize(RawSchedule.model_validate(raw), "119_1").days[0].lessons[0]
    assert lesson.subject == "Дисциплина не указана"
    assert lesson.teacher is None
    assert lesson.teacher_full is None
    assert lesson.room is None
    assert lesson.lesson_type is None
    assert lesson.group is None
    assert lesson.subgroup is None


def test_invalid_data_is_rejected(raw):
    raw["tblData"][0]["pairs"][0]["pair"] = 9
    with pytest.raises(ValidationError):
        RawSchedule.model_validate(raw)


def test_invalid_period_is_rejected(raw):
    raw["interval"] = "Неизвестный период"
    with pytest.raises(ValueError):
        normalize(RawSchedule.model_validate(raw), "119_1")


@pytest.mark.asyncio
async def test_cache_and_concurrent_requests(raw):
    data = normalize(RawSchedule.model_validate(raw), "119_1")
    async def slow_fetch(group_id):
        await asyncio.sleep(0.01)
        return data
    fetcher = AsyncMock(side_effect=slow_fetch)
    clock = [100.0]
    service = ScheduleService(fetcher, lambda: clock[0])
    results = await asyncio.gather(*(service.get("119_1") for _ in range(20)))
    assert len(results) == 20
    assert fetcher.await_count == 1
    clock[0] += settings.cache_ttl + 1
    await service.get("119_1")
    assert fetcher.await_count == 2


@pytest.mark.asyncio
async def test_stale_fallback_and_expiry(raw):
    data = normalize(RawSchedule.model_validate(raw), "119_1")
    fetcher = AsyncMock(return_value=data)
    clock = [100.0]
    service = ScheduleService(fetcher, lambda: clock[0])
    await service.get("119_1")
    clock[0] += settings.cache_ttl + 1
    fetcher.side_effect = httpx.ConnectError("private error must not leak")
    stale = await service.get("119_1")
    assert stale.stale and stale.fetched_at == data.fetched_at
    assert not data.stale
    await service.get("119_1")
    assert fetcher.await_count == 2
    clock[0] += settings.max_stale_seconds + 1
    with pytest.raises(Unavailable):
        await service.get("119_1")


@pytest.mark.asyncio
async def test_failed_requests_are_also_limited():
    fetcher = AsyncMock(side_effect=httpx.ConnectError("unavailable"))
    service = ScheduleService(fetcher)
    for _ in range(4):
        with pytest.raises(Unavailable):
            await service.get("119_1")
    assert fetcher.await_count == 1
    with pytest.raises(RateLimited):
        await service.get("119_1", force=True)


@pytest.mark.asyncio
async def test_refresh_cooldown(raw):
    fetcher = AsyncMock(return_value=normalize(RawSchedule.model_validate(raw), "119_1"))
    clock = [100.0]
    service = ScheduleService(fetcher, lambda: clock[0])
    await service.get("119_1")
    with pytest.raises(RateLimited):
        await service.get("119_1", force=True)
    clock[0] += settings.refresh_cooldown + 1
    await service.get("119_1", force=True)
    assert fetcher.await_count == 2


@pytest.mark.asyncio
async def test_api_errors_and_registered_groups(monkeypatch):
    import app.main as main
    fake_service = ScheduleService(AsyncMock(side_effect=ValueError("SECRET traceback")))
    monkeypatch.setattr(main, "service", fake_service)
    monkeypatch.setattr(main.settings, "allow_manual_refresh", False)
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=main.app), base_url="http://test") as client:
        assert (await client.get("/api/health")).json()["status"] == "ok"
        assert (await client.get("/api/groups")).json()[0]["id"] == "119_1"
        assert (await client.get("/api/config")).json() == {"manual_refresh": False}
        assert (await client.post("/api/schedule/refresh")).status_code == 403
        fake_service.fetcher.assert_not_awaited()
        assert (await client.get("/api/schedule?group_id=https://evil.example")).status_code == 404
        response = await client.get("/api/schedule")
        assert response.status_code == 503
        assert "SECRET" not in response.text
        monkeypatch.setattr(main.settings, "allow_manual_refresh", True)
        assert (await client.get("/api/config")).json() == {"manual_refresh": True}
        response = await client.post("/api/schedule/refresh")
        assert response.status_code == 429
        assert int(response.headers["Retry-After"]) > 0


@pytest.mark.asyncio
async def test_university_client_uses_multipart(monkeypatch, raw):
    import app.services.university_client as university
    captured = []

    async def handler(request):
        captured.append(request)
        return httpx.Response(200, json=raw)

    real_client = httpx.AsyncClient
    monkeypatch.setattr(university.httpx, "AsyncClient", lambda **kwargs: real_client(
        transport=httpx.MockTransport(handler), **kwargs))
    await university.fetch_schedule("119_1")
    request = captured[0]
    assert request.headers["content-type"].startswith("multipart/form-data; boundary=")
    assert b'name="intervalMode"\r\n\r\n4' in request.content
    assert b'name="flow"\r\n\r\n119_1' in request.content
    assert "cookie" not in request.headers
    await university.fetch_schedule("3:2:140_1")
    assert b'name="flow"\r\n\r\n140_1' in captured[1].content
    assert b'name="course"\r\n\r\n2' in captured[1].content
    assert b'name="eduform"\r\n\r\n3' in captured[1].content
