import json
from pathlib import Path
from typing import Any

from app.core.config import settings


def evaluate_weather_risks(weather: dict[str, Any], crop: str = "Tomato") -> list[dict[str, str]]:
    alerts: list[dict[str, str]] = []
    for rule in _load_rules():
        if rule["crop"].casefold() != crop.casefold():
            continue
        triggered = [
            f"{field} {weather[field]} {operator} {threshold}"
            for field, operator, threshold in rule["conditions"]
            if _matches(weather.get(field), operator, threshold)
        ]
        if len(triggered) == len(rule["conditions"]) and triggered:
            alerts.append(
                {
                    "title": rule["title"],
                    "explanation": f"Potential risk indicator only; observed conditions: {', '.join(triggered)}. This is not a disease diagnosis.",
                    "source": rule["source"],
                }
            )
    return alerts


def _load_rules() -> list[dict[str, Any]]:
    path: Path = settings.risk_rules_path
    if not path.is_file():
        raise FileNotFoundError(f"Weather risk rules file was not found: {path}")
    with path.open(encoding="utf-8") as file:
        data = json.load(file)
    if not isinstance(data, list):
        raise ValueError("Risk rules must be a JSON list.")
    for rule in data:
        if not isinstance(rule, dict) or not all(key in rule for key in ("crop", "title", "conditions", "source")):
            raise ValueError("Each risk rule requires crop, title, conditions, and source.")
        if not all(isinstance(rule[key], str) and rule[key].strip() for key in ("crop", "title", "source")):
            raise ValueError("Risk rule crop, title, and source must be non-empty strings.")
        if not isinstance(rule["conditions"], list) or not rule["conditions"]:
            raise ValueError("Each risk rule requires at least one condition.")
        for condition in rule["conditions"]:
            if (
                not isinstance(condition, list)
                or len(condition) != 3
                or not isinstance(condition[0], str)
                or not isinstance(condition[1], str)
                or condition[1] not in {">=", "<="}
            ):
                raise ValueError("Risk conditions must be [weather_field, >= or <=, numeric_threshold].")
            if condition[0] not in {"temperature_c", "humidity_pct", "rainfall_mm", "wind_mps"}:
                raise ValueError(f"Unsupported weather condition field: {condition[0]}")
            if isinstance(condition[2], bool) or not isinstance(condition[2], (int, float)):
                raise ValueError("Risk thresholds must be numeric.")
    return data


def _matches(value: Any, operator: str, threshold: float) -> bool:
    if not isinstance(value, (int, float)):
        return False
    return value >= threshold if operator == ">=" else value <= threshold
