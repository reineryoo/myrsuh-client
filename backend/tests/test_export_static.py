import json
from datetime import date, datetime, timedelta
from unittest.mock import AsyncMock

import httpx
import pytest

import export_static
from app.config.groups import GROUPS
from app.models import Schedule
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
