"""Обновление локального каталога групп из публичного справочника РГГУ."""

import json
import time
from pathlib import Path

import httpx


def main():
    """Загружает группы ИИНиТБ и выбранную группу Института психологии.

    Проверяет наличие известной группы и заменяет каталог через временный
    файл только после завершения всех запросов. При ошибке загрузки прежний
    каталог остаётся доступным приложению.
    """
    catalog = []
    with httpx.Client(base_url="https://raspis.rggu.ru/api/", timeout=20) as client:
        response = client.post("Get_Eduforms_Courses_Lists")
        response.raise_for_status()
        options = response.json()
        for form in options["eduform"]:
            for course in options["course"]:
                params = {"eduform": str(form["id"]), "course": str(course["id"])}
                response = client.post("Get_Flows_List", data={"0": json.dumps(params)})
                response.raise_for_status()
                rows = response.json()
                if not isinstance(rows, list):
                    raise ValueError(f"Expected a list for {params}")
                rows = [row for row in rows
                        if row["data"].split("-", 1)[0].strip().casefold() == "иинитб"
                        or (params["eduform"] == "3" and params["course"] == "2"
                            and row["id"] == "213_1")]
                if rows:
                    catalog.append({"eduform": params["eduform"], "course": int(params["course"]),
                                    "education": form["description"], "rows": rows})
                time.sleep(.12)
    if not any(batch["eduform"] == "3" and batch["course"] == 2
               and any(row["id"] == "119_1" for row in batch["rows"]) for batch in catalog):
        raise ValueError("Catalog is missing the known group 119_1")
    destination = Path(__file__).parent / "app/config/group_catalog.json"
    temporary = destination.with_suffix(".tmp")
    temporary.write_text(json.dumps(catalog, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    temporary.replace(destination)
    print(f"Imported {sum(len(batch['rows']) for batch in catalog)} records")


if __name__ == "__main__":
    main()
