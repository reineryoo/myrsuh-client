import json
import re
from pathlib import Path


UNIVERSITY = "Российский государственный гуманитарный университет"


def load_groups():
    """Собирает справочник групп приложения из локального каталога РГГУ.

    Записи одного потока объединяются с сохранением направлений и профилей.
    Форма обучения и курс входят в ключ, чтобы одинаковые ID потоков
    из разных списков не перезаписывали друг друга.
    """
    groups = {}
    path = Path(__file__).with_name("group_catalog.json")
    for batch in json.loads(path.read_text(encoding="utf-8")):
        eduform, course = batch["eduform"], batch["course"]
        education = batch["education"].replace("1-е высшее, ", "").replace("2-е высшее, ", "Второе высшее · ")
        for old, new in (("Бакалавры и Специалисты", "бакалавриат / специалитет"), ("Бакалавры", "бакалавриат"), ("Магистры", "магистратура"), (" ФО", "")):
            education = education.replace(old, new)
        rows_by_id = {}
        for row in batch["rows"]:
            rows_by_id.setdefault(row["id"], []).append(row)
        for upstream_id, rows in rows_by_id.items():
            group_id = f"{eduform}:{course}:{upstream_id}"
            if group_id == "3:2:119_1":
                group_id = "119_1"  # Сохраняем совместимость с ранее выбранной группой и ссылками API.
            label = rows[0]["data"]
            match = re.fullmatch(r"(.*?)\s*\(Группа:\s*([^)]+)\)\s*", label)
            flow, number = match.groups() if match else (label, "")
            groups[group_id] = {
                "id": group_id, "upstream_id": upstream_id, "eduform": eduform,
                "university": UNIVERSITY,
                "institute": flow.split("-", 1)[0],
                "direction": " · ".join(dict.fromkeys(row["direction"] for row in rows)),
                "profile": " · ".join(dict.fromkeys(row["profile"] for row in rows)),
                "course": course, "group": number, "education": education,
                "flow": flow, "label": " · ".join(dict.fromkeys(row["data"] for row in rows)),
            }
    return {"119_1": groups.pop("119_1"), **groups}


GROUPS = load_groups()
