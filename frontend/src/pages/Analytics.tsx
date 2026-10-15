import { useCallback, useEffect, useState } from "react";
import { Download, TrendingUp } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { apiClient, errorMessage } from "../lib/api";
import { ErrorNotice, LoadingState, PageHeading } from "../components/ui";
import type { Overview } from "../types";

const palette = ["#2e8056", "#8bb66a", "#d0a45e", "#6e8fa0", "#bd7962"];

export function Analytics() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [trends, setTrends] = useState<{ date: string; scans: number }[]>([]);
  const [period, setPeriod] = useState<"weekly" | "monthly">("weekly");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const fetchData = useCallback(async () => {
    try {
      const [stats, points] = await Promise.all([apiClient.overview(), apiClient.trends(period)]);
      setOverview(stats); setTrends(points); setError("");
    } catch (failure) { setError(errorMessage(failure)); }
    finally { setLoading(false); }
  }, [period]);
  const load = useCallback(() => { setLoading(true); void fetchData(); }, [fetchData]);
  // Fetching server data is this effect's external synchronization.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void fetchData(); }, [fetchData]);
  return <>
    <PageHeading eyebrow="Database-backed insights" title="Analytics" description="Summaries are calculated from scans saved to your account. Trends describe historical activity, not future outbreaks." action={<button className="btn-secondary" onClick={() => void apiClient.download("/api/v1/reports/scans.csv", "farmshield-analytics.csv")}><Download size={16} />Export records</button>} />
    {error && <div className="mb-5"><ErrorNotice message={error} retry={() => void load()} /></div>}
    {loading ? <LoadingState /> : overview && <>
      <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[
        ["Stored scans", overview.total_scans], ["Classified outputs", overview.healthy + overview.disease_detections],
        ["Uncertain outputs", overview.uncertain], ["No model result", overview.unavailable],
      ].map(([label, value]) => <article key={label} className="card p-5"><p className="text-sm text-slate-500">{label}</p><p className="mt-2 text-3xl font-extrabold">{value}</p></article>)}</div>
      {overview.total_scans === 0 ? <div className="card p-12 text-center"><TrendingUp className="mx-auto text-leaf" /><h2 className="mt-3 font-bold">Your analytics will grow with your records</h2><p className="mt-1 text-sm text-slate-500">No scans are stored yet. Create a scan to see your own activity here.</p></div> : <div className="grid gap-5 xl:grid-cols-2">
        <section className="card p-5"><div className="flex items-start justify-between"><div><h2 className="font-bold">Scan trend</h2><p className="mt-1 text-xs text-slate-500">Historical count, not a forecast</p></div><select aria-label="Trend period" className="field w-auto" value={period} onChange={(event) => setPeriod(event.target.value as "weekly" | "monthly")}><option value="weekly">Last 7 days</option><option value="monthly">Last 30 days</option></select></div>
          <div className="mt-5 h-72">{trends.length ? <ResponsiveContainer width="100%" height="100%"><BarChart data={trends} margin={{ left: -18, right: 8 }}><CartesianGrid stroke="#edf1eb" vertical={false} /><XAxis dataKey="date" tick={{ fontSize: 10 }} /><YAxis allowDecimals={false} tick={{ fontSize: 11 }} /><Tooltip /><Bar dataKey="scans" fill="#2e8056" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer> : <div className="grid h-full place-items-center text-sm text-slate-400">No records in this period.</div>}</div>
        </section>
        <section className="card p-5"><h2 className="font-bold">Disease distribution</h2><p className="mt-1 text-xs text-slate-500">Classifier output, when available</p>
          {overview.disease_distribution.length ? <div className="mt-3 grid items-center gap-4 sm:grid-cols-[.8fr_1.2fr]"><div className="h-56"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={overview.disease_distribution} dataKey="count" nameKey="name" innerRadius={48} outerRadius={82} paddingAngle={3}>{overview.disease_distribution.map((item, index) => <Cell key={item.name} fill={palette[index % palette.length]} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer></div><ul className="space-y-3">{overview.disease_distribution.map((item, index) => <li key={item.name} className="flex items-center gap-2 text-sm"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: palette[index % palette.length] }} /><span className="flex-1">{item.name.replace("Tomato___", "").replaceAll("_", " ")}</span><b>{item.count}</b></li>)}</ul></div> : <div className="grid h-64 place-items-center text-sm text-slate-400">No classified outcomes to display.</div>}
        </section>
      </div>}
      <p className="mt-5 text-xs leading-5 text-slate-400">Uncertain and model-unavailable scans are retained separately. Counts do not imply diagnosis quality or agricultural prevalence.</p>
    </>}
  </>;
}
