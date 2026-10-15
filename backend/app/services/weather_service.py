import time
from typing import Any

import httpx

from app.core.config import settings

_cache: dict[str, tuple[float, dict[str, Any]]] = {}
BASE_URL = "https://api.openweathermap.org/data/2.5"


class WeatherUnavailable(RuntimeError):
    pass


async def current_weather(latitude: float, longitude: float) -> dict[str, Any]:
    if not -90 <= latitude <= 90 or not -180 <= longitude <= 180:
        raise ValueError("Latitude must be between -90 and 90 and longitude between -180 and 180.")
    if not settings.openweather_api_key:
        raise WeatherUnavailable("Weather is not configured. Add OPENWEATHER_API_KEY to backend/.env.")
    key = f"{latitude:.3f}:{longitude:.3f}"
    cached = _cache.get(key)
    now = time.monotonic()
    if cached and now - cached[0] < settings.weather_cache_seconds:
        return {**cached[1], "cached": True}
    try:
        async with httpx.AsyncClient(timeout=8) as client:
            response = await client.get(
                f"{BASE_URL}/weather",
                params={"lat": latitude, "lon": longitude, "appid": settings.openweather_api_key, "units": "metric"},
            )
        if response.status_code == 429:
            raise WeatherUnavailable("Weather provider rate limit reached. Please retry later.")
        response.raise_for_status()
        payload = response.json()
        weather = {
            "source": "OpenWeatherMap",
            "location": payload.get("name") or "Farm coordinates",
            "temperature_c": payload["main"]["temp"],
            "humidity_pct": payload["main"]["humidity"],
            "rainfall_mm": payload.get("rain", {}).get("1h"),
            "wind_mps": payload["wind"]["speed"],
            "condition": payload["weather"][0]["description"],
            "observed_at": payload.get("dt"),
            "cached": False,
        }
        _cache[key] = (now, weather)
        return weather
    except WeatherUnavailable:
        raise
    except (httpx.HTTPError, KeyError, IndexError, TypeError, ValueError) as exc:
        raise WeatherUnavailable("Weather provider is currently unavailable. Check the API key and farm coordinates.") from exc


async def forecast(latitude: float, longitude: float) -> dict[str, Any]:
    if not settings.openweather_api_key:
        raise WeatherUnavailable("Weather is not configured. Add OPENWEATHER_API_KEY to backend/.env.")
    try:
        async with httpx.AsyncClient(timeout=8) as client:
            response = await client.get(
                f"{BASE_URL}/forecast",
                params={"lat": latitude, "lon": longitude, "appid": settings.openweather_api_key, "units": "metric"},
            )
        if response.status_code == 429:
            raise WeatherUnavailable("Weather provider rate limit reached. Please retry later.")
        response.raise_for_status()
        payload = response.json()
        return {
            "source": "OpenWeatherMap forecast",
            "items": [
                {
                    "time": item["dt_txt"],
                    "temperature_c": item["main"]["temp"],
                    "humidity_pct": item["main"]["humidity"],
                    "condition": item["weather"][0]["description"],
                    "rainfall_mm": item.get("rain", {}).get("3h"),
                }
                for item in payload.get("list", [])
            ],
        }
    except WeatherUnavailable:
        raise
    except (httpx.HTTPError, KeyError, IndexError, TypeError) as exc:
        raise WeatherUnavailable("Forecast provider is currently unavailable.") from exc
