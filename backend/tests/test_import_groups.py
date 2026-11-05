import json

import httpx

import import_groups


def test_import_retains_selected_psychology_group_only_for_its_form_and_course(monkeypatch, tmp_path):
    rows = [
        {"id": "119_1", "data": "ИИНиТБ-ФИСБ-ПИ-ПИИ (Группа: 1)"},
        {"id": "213_1", "data": "ИП-ПФ-ПСД-ПМиОК (Группа: 1)"},
        {"id": "214_1", "data": "ИП-ПФ-ДРУГАЯ (Группа: 1)"},
    ]
    options = {
        "eduform": [{"id": "3", "description": "Очная"}, {"id": "4", "description": "Очно-заочная"}],
        "course": [{"id": 1}, {"id": 2}],
    }

    def handler(request):
        return httpx.Response(200, json=options if request.url.path.endswith("Get_Eduforms_Courses_Lists") else rows)

    real_client = httpx.Client
    monkeypatch.setattr(import_groups.httpx, "Client", lambda **kwargs: real_client(
        transport=httpx.MockTransport(handler), **kwargs))
    monkeypatch.setattr(import_groups.time, "sleep", lambda _: None)
    monkeypatch.setattr(import_groups, "__file__", str(tmp_path / "import_groups.py"))
    destination = tmp_path / "app/config/group_catalog.json"
    destination.parent.mkdir(parents=True)

    import_groups.main()

    batches = json.loads(destination.read_text(encoding="utf-8"))
    for batch in batches:
        expected = ["119_1", "213_1"] if batch["eduform"] == "3" and batch["course"] == 2 else ["119_1"]
        assert [row["id"] for row in batch["rows"]] == expected
