import { useEffect, useState } from "react";
import { CloudDrizzle, CloudSun, Droplets, MapPin, Wind } from "lucide-react";
import { apiClient, errorMessage } from "../lib/api";
import { ErrorNotice, LoadingState, PageHeading } from "../components/ui";
import type { Farm } from "../types";

interface Weather {
  source: string; location: string; temperature_c: number; humidity_pct: number;
  rainfall_mm: number | null; wind_mps: number; condition: string; observed_at: number;
}

export function Weather() {
  const [farms, setFarms] = useState<Farm[]>([]);
  const [farmId, setFarmId] = useState("");
  const [weather, setWeather] = useState<Weather | null>(null);
  const [forecastItems, setForecastItems] = useState<{ time: string; temperature_c: number; humidity_pct: number; condition: string; rainfall_mm: number | null }[]>([]);
  const [riskMessage, setRiskMessage] = useState("");
  const [forecastError, setForecastError] = useState("");
  const [alerts, setAlerts] = useState<{ title: string; explanation: string; source: string }[]>([]);
  const [error, setError] = useState("");
  const [farmsLoading, setFarmsLoading] = useState(true);
  const [loadedKey, setLoadedKey] = useState("");
  const [refreshCount, setRefreshCount] = useState(0);
  const requestKey = `${farmId}:${refreshCount}`;
  useEffect(() => {
    apiClient.farms().then((items) => {
      const withCoordinates = items.filter((farm) => farm.latitude !== null && farm.longitude !== null);
      setFarms(withCoordinates);
      if (withCoordinates[0]) setFarmId(withCoordinates[0].id);
    }).catch((failure) => { setError(errorMessage(failure)); })
      .finally(() => setFarmsLoading(false));
  }, []);
  useEffect(() => {
    if (!farmId) return;
    let active = true;
    Promise.all([apiClient.weather(farmId), apiClient.risks(farmId)]).then(([current, risk]) => {
      if (!active) return;
      setWeather(current as Weather);
      setAlerts(risk.alerts);
      setRiskMessage(risk.message || "");
      setForecastError("");
      setError("");
      void apiClient.forecast(farmId).then((forecast) => {
        if (active) setForecastItems(forecast.items);
      }).catch((failure) => {
        if (active) { setForecastItems([]); setForecastError(errorMessage(failure)); }
      });
    }).catch((failure) => { if (active) { setWeather(null); setForecastItems([]); setError(errorMessage(failure)); } })
      .finally(() => { if (active) setLoadedKey(requestKey); });
    return () => { active = false; };
  }, [farmId, requestKey]);
  const loading = farmsLoading || Boolean(farmId && loadedKey !== requestKey);

  return <>
    <PageHeading eyebrow="Farm microclimate" title="Weather intelligence" description="Provider-sourced observations for your selected farm, shown separately from crop-risk interpretation." action={farms.length > 0 ? <label className="flex items-center gap-2 text-sm font-semibold"><MapPin size={16} className="text-leaf" /><select className="field min-w-48" aria-label="Select farm" value={farmId} onChange={(event) => setFarmId(event.target.value)}>{farms.map((farm) => <option key={farm.id} value={farm.id}>{farm.name}</option>)}</select></label> : undefined} />
    {!farms.length && !loading && <div className="card p-10 text-center"><MapPin className="mx-auto text-leaf" /><h2 className="mt-3 font-bold">Farm coordinates needed</h2><p className="mt-1 text-sm text-slate-500">Add a farm with latitude and longitude before requesting live weather.</p></div>}
    {error && <div className="mb-5"><ErrorNotice message={error} retry={() => setRefreshCount((count) => count + 1)} /></div>}
    {loading ? <LoadingState label="Requesting live weather…" /> : weather && <>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-sky-100 bg-sky-50 px-4 py-3 text-sm text-sky-900"><span className="flex items-center gap-2"><CloudSun size={18} />Observed weather · {weather.source} · {weather.location}</span><span className="text-xs">Updated {new Date(weather.observed_at * 1000).toLocaleString()}</span></div>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[
        { title: "Temperature", value: `${weather.temperature_c}°C`, icon: CloudSun },
        { title: "Relative humidity", value: `${weather.humidity_pct}%`, icon: Droplets },
        { title: "Rainfall (last hour)", value: weather.rainfall_mm === null ? "Not reported" : `${weather.rainfall_mm} mm`, icon: CloudDrizzle },
        { title: "Wind speed", value: `${weather.wind_mps} m/s`, icon: Wind },
      ].map(({ title, value, icon: Icon }) => <article key={title} className="card p-5"><span className="grid h-10 w-10 place-items-center rounded-xl bg-lime/50 text-forest"><Icon size={20} /></span><p className="mt-5 text-sm text-slate-500">{title}</p><p className="mt-1 text-2xl font-extrabold">{value}</p>{title === "Temperature" && <p className="mt-1 text-xs capitalize text-slate-400">{weather.condition}</p>}</article>)}</section>
      <section className="card mt-5 p-5 sm:p-6"><div className="flex flex-wrap items-center justify-between gap-2"><div><h2 className="font-bold">Provider forecast</h2><p className="mt-1 text-xs text-slate-500">Forecast data—not observed conditions · {farmId ? "OpenWeatherMap" : ""}</p></div><span className="text-xs text-slate-400">{forecastItems.length ? `${Math.min(forecastItems.length, 8)} upcoming intervals` : "Forecast unavailable"}</span></div>
        {forecastError && <p role="status" className="mt-3 text-sm text-amber-800">{forecastError}</p>}
        {forecastItems.length ? <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">{forecastItems.slice(0, 8).map((item) => <article key={item.time} className="rounded-xl bg-slate-50 p-3"><p className="text-xs font-semibold text-slate-500">{new Date(`${item.time.replace(" ", "T")}Z`).toLocaleString()}</p><p className="mt-2 text-lg font-extrabold">{item.temperature_c}°C</p><p className="text-xs capitalize text-slate-500">{item.condition} · {item.humidity_pct}% RH</p>{item.rainfall_mm !== null && <p className="mt-1 text-xs text-sky-700">Rain: {item.rainfall_mm} mm / 3h</p>}</article>)}</div> : !forecastError && <p className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-500">No forecast intervals were returned by the provider.</p>}
      </section>
      <section className="mt-6 card p-5 sm:p-6"><p className="eyebrow">Risk center</p><h2 className="mt-2 text-xl font-bold">Weather-related crop advisories</h2>
        {alerts.length ? <div className="mt-4 space-y-3">{alerts.map((alert) => <article key={alert.title} className="rounded-xl border border-amber-200 bg-amber-50 p-4"><h3 className="font-bold text-amber-900">{alert.title}</h3><p className="mt-1 text-sm text-amber-900">{alert.explanation}</p><p className="mt-2 text-xs text-amber-700">Rule source: {alert.source}</p></article>)}</div> : <p className="mt-3 rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">{riskMessage || "No validated crop-specific weather rules are configured. Weather is shown as observation only; no disease-risk claim is generated."}</p>}
        <p className="mt-4 text-xs leading-5 text-slate-400">Observed weather facts are not disease confirmation. Weather alerts are potential-risk indicators only and require documented crop-specific rules.</p>
      </section>
    </>}
  </>;
}
