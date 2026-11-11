import json
from datetime import date, datetime, timedelta
from unittest.mock import AsyncMock

import httpx
import pytest

import export_static
from app.config.groups import GROUPS
from app.models import Day, Group, Lesson, RawFlow, Schedule
from app.services.normalize import MOSCOW


def sample(group_id="119_1"):
    return Schedule(
        group_id=group_id, period_start=date(2026, 8, 24), period_end=date(2027, 3, 21),
        days=[], bells={}, academic_year=None, semester=None,
        university_updated_at=None, fetched_at=datetime.now(MOSCOW),
    )


@pytest.mark.asyncio
async def test_exports_catalog_config_and_windows_safe_schedule_names(tmp_path):
    groups = {key: GROUPS[key] for key in ("119_1", "3:2:213_1")}
    await export_static.export_schedules(tmp_path, groups=groups, fetcher=AsyncMock(side_effect=sample))
    items = json.loads((tmp_path / "groups.json").read_text(encoding="utf-8"))
    assert [item["id"] for item in items] == list(groups)
    assert "upstream_id" not in items[0]
    assert json.loads((tmp_path / "config.json").read_text()) == {"manual_refresh": False}
    path = tmp_path / "schedules/3_3A2_3A213_1.json"
    assert Schedule.model_validate_json(path.read_text(encoding="utf-8")).group_id == "3:2:213_1"


@pytest.mark.asyncio
async def test_reuses_previous_schedule_when_university_is_unavailable(tmp_path):
    saved = sample()
    fetcher = AsyncMock(return_value=saved)
    groups = {"119_1": GROUPS["119_1"]}
    await export_static.export_schedules(tmp_path, groups=groups, fetcher=fetcher)
    fetcher.side_effect = httpx.ConnectError("Unavailable")
    await export_static.export_schedules(tmp_path, groups=groups, fetcher=fetcher)
    result = Schedule.model_validate_json((tmp_path / "schedules/119_1.json").read_text(encoding="utf-8"))
    assert result.stale
    assert result.fetched_at == saved.fetched_at
    assert not saved.stale


@pytest.mark.asyncio
async def test_failed_export_preserves_previous_files(tmp_path):
    marker = tmp_path / "groups.json"
    marker.write_text("previous catalog", encoding="utf-8")
    with pytest.raises(RuntimeError, match="No usable schedule"):
        await export_static.export_schedules(tmp_path, groups={"119_1": GROUPS["119_1"]},
                                            fetcher=AsyncMock(side_effect=ValueError("Invalid upstream data")))
    assert marker.read_text(encoding="utf-8") == "previous catalog"
    assert not (tmp_path / "schedules").exists()


@pytest.mark.asyncio
async def test_can_restore_copy_from_published_site(monkeypatch, tmp_path):
    saved = sample()

    async def handler(request):
        assert request.url.path == "/myrsuh-client/data/schedules/119_1.json"
        return httpx.Response(200, json=saved.model_dump(mode="json"))

    client = httpx.AsyncClient
    monkeypatch.setattr(export_static.httpx, "AsyncClient", lambda **kwargs: client(
        transport=httpx.MockTransport(handler), **kwargs))
    await export_static.export_schedules(tmp_path, "https://example.test/myrsuh-client/",
                                        groups={"119_1": GROUPS["119_1"]},
                                        fetcher=AsyncMock(side_effect=ValueError("Unavailable")))
    result = json.loads((tmp_path / "schedules/119_1.json").read_text(encoding="utf-8"))
    assert result["stale"]


def test_rejects_wrong_group_and_expired_copies():
    saved = sample()
    with pytest.raises(ValueError):
        export_static.validate_previous(saved.model_dump(), "3:2:213_1")
    saved.fetched_at -= timedelta(days=8)
    with pytest.raises(ValueError):
        export_static.validate_previous(saved.model_dump(), "119_1")


def sample_with_lessons():
    schedule = sample()
    lesson = Lesson(
        id="generated-1", pair=1, start="09:00", end="10:20", subject="Математика",
        room="114", teacher="Иванов", teacher_full="Иванов Иван Иванович",
        lesson_type="лек", group="ПИ ПИИ", subgroup="1", source=RawFlow(id_subject="10"),
    )
    schedule.days = [
        Day(date=date(2026, 11, 10), lessons=[lesson, lesson.model_copy(update={"id": "generated-2", "subgroup": "2"})]),
        Day(date=date(2026, 11, 11), lessons=[]),
    ]
    return schedule


@pytest.fixture
def published_site(monkeypatch):
    client_class = httpx.AsyncClient

    def configure(schedule):
        files = {
            "groups.json": [Group.model_validate(GROUPS[schedule.group_id]).model_dump(mode="json")],
            "config.json": {"manual_refresh": False},
            "schedules/" + export_static.schedule_filename(schedule.group_id): schedule.model_dump(mode="json"),
        }

        def handler(request):
            assert request.headers["Cache-Control"] == "no-cache"
            prefix = "/myrsuh-client/data/"
            assert request.url.path.startswith(prefix)
            data = files.get(request.url.path.removeprefix(prefix))
            if isinstance(data, Exception):
                raise data
            return httpx.Response(404) if data is None else httpx.Response(200, json=data)

        monkeypatch.setattr(export_static.httpx, "AsyncClient", lambda **kwargs: client_class(
            transport=httpx.MockTransport(handler), **kwargs))
        return files

    return configure


async def check_changes(tmp_path, schedule):
    return await export_static.export_schedules(
        tmp_path, "https://example.test/myrsuh-client/", check_changes=True,
        groups={schedule.group_id: GROUPS[schedule.group_id]}, fetcher=AsyncMock(return_value=schedule),
    )


@pytest.mark.asyncio
async def test_unchanged_content_skips_publication_but_saves_fresh_verified_copy(tmp_path, published_site):
    saved = sample_with_lessons()
    saved.fetched_at -= timedelta(days=30)
    published_site(saved)
    fresh = saved.model_copy(deep=True)
    fresh.fetched_at = datetime.now(MOSCOW)
    fresh.university_updated_at = datetime.now(MOSCOW)
    fresh.days.reverse()
    fresh.days[1].lessons.reverse()
    for index, lesson in enumerate(fresh.days[1].lessons):
        lesson.id = f"different-generated-{index}"
        lesson.source.id_subject = "different-upstream-id"
    before = fresh.model_dump()

    assert await check_changes(tmp_path, fresh) is False
    result = Schedule.model_validate_json((tmp_path / "schedules/119_1.json").read_text(encoding="utf-8"))
    assert result.fetched_at == fresh.fetched_at
    assert result.university_updated_at == fresh.university_updated_at
    assert fresh.model_dump() == before


@pytest.mark.asyncio
@pytest.mark.parametrize("field,value", [
    ("subject", "Физика"), ("room", "115"), ("teacher", "Петров"),
    ("teacher_full", "Петров Пётр Петрович"), ("lesson_type", "сем"),
    ("start", "09:10"), ("end", "10:30"), ("subgroup", "3"),
])
async def test_lesson_changes_require_publication(tmp_path, published_site, field, value):
    saved = sample_with_lessons()
    published_site(saved)
    fresh = saved.model_copy(deep=True)
    setattr(fresh.days[0].lessons[0], field, value)
    assert await check_changes(tmp_path, fresh) is True


@pytest.mark.asyncio
@pytest.mark.parametrize("field,value", [
    ("period_end", date(2027, 4, 1)), ("semester", "2"), ("bells", {1: ("09:10", "10:30")}),
])
async def test_period_and_bells_changes_require_publication(tmp_path, published_site, field, value):
    saved = sample()
    published_site(saved)
    assert await check_changes(tmp_path, saved.model_copy(update={field: value})) is True


@pytest.mark.asyncio
@pytest.mark.parametrize("filename,data", [
    ("groups.json", []),
    ("groups.json", {"invalid": "catalog"}),
    ("config.json", {"manual_refresh": True}),
    ("schedules/119_1.json", None),
    ("schedules/119_1.json", {"invalid": "schedule"}),
    ("groups.json", httpx.ConnectError("Published site unavailable")),
])
async def test_missing_changed_or_invalid_baseline_requires_publication(tmp_path, published_site, filename, data):
    fresh = sample()
    files = published_site(fresh)
    files[filename] = data
    assert await check_changes(tmp_path, fresh) is True


@pytest.mark.asyncio
async def test_compares_with_live_site_even_if_new_content_was_already_cached(tmp_path, published_site):
    saved = sample_with_lessons()
    published_site(saved)
    fresh = saved.model_copy(deep=True)
    fresh.days[0].lessons.pop()
    await export_static.export_schedules(tmp_path, groups={"119_1": GROUPS["119_1"]},
                                        fetcher=AsyncMock(return_value=fresh))
    assert await check_changes(tmp_path, fresh) is True


@pytest.mark.asyncio
async def test_stale_warning_appears_once_and_clears_on_source_recovery(tmp_path, published_site):
    fresh = sample()
    files = published_site(fresh)
    groups = {"119_1": GROUPS["119_1"]}
    await check_changes(tmp_path, fresh)
    unavailable = AsyncMock(side_effect=httpx.ConnectError("University unavailable"))

    assert await export_static.export_schedules(tmp_path, "https://example.test/myrsuh-client/",
                                               check_changes=True, groups=groups, fetcher=unavailable) is True
    stale = json.loads((tmp_path / "schedules/119_1.json").read_text(encoding="utf-8"))
    files["schedules/119_1.json"] = stale
    assert await export_static.export_schedules(tmp_path, "https://example.test/myrsuh-client/",
                                               check_changes=True, groups=groups, fetcher=unavailable) is False
    assert await check_changes(tmp_path, fresh) is True


@pytest.mark.asyncio
async def test_code_publication_is_not_skipped_when_data_is_unchanged(tmp_path, published_site):
    fresh = sample()
    published_site(fresh)
    assert await export_static.export_schedules(tmp_path, groups={"119_1": GROUPS["119_1"]},
                                               fetcher=AsyncMock(return_value=fresh)) is True


@pytest.mark.asyncio
async def test_comparison_requires_published_site_url_before_fetching(tmp_path):
    fetcher = AsyncMock()
    with pytest.raises(ValueError, match="published site URL"):
        await export_static.export_schedules(tmp_path, check_changes=True, fetcher=fetcher)
    fetcher.assert_not_called()
