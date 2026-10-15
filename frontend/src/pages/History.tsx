import { useCallback, useEffect, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, Download, Search, Trash2 } from "lucide-react";
import { apiClient, errorMessage } from "../lib/api";
import { ErrorNotice, LoadingState, PageHeading, StatusBadge } from "../components/ui";
import { ScanThumbnail } from "../components/ScanThumbnail";
import type { Page, Scan } from "../types";

export function History() {
  const [page, setPage] = useState<Page<Scan> | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [search, setSearch] = useState("");
  const [crop, setCrop] = useState("");
  const [disease, setDisease] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchScans = useCallback(async () => {
    try {
      const data = await apiClient.scans({
        page: pageNumber, page_size: 10, search: search || undefined, crop: crop || undefined,
        disease: disease || undefined, start_date: startDate || undefined, end_date: endDate || undefined,
      });
      setPage(data);
      setError("");
    } catch (failure) { setError(errorMessage(failure)); }
    finally { setLoading(false); }
  }, [pageNumber, search, crop, disease, startDate, endDate]);
  const load = useCallback(() => { setLoading(true); void fetchScans(); }, [fetchScans]);
  // Fetching server data is this effect's external synchronization.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void fetchScans(); }, [fetchScans]);

  async function remove(scan: Scan) {
    if (!window.confirm("Delete this scan and its stored image? This cannot be undone.")) return;
    try { await apiClient.deleteScan(scan.id); await fetchScans(); }
    catch (failure) { setError(errorMessage(failure)); }
  }

  return <>
    <PageHeading eyebrow="Private scan records" title="Scan history" description="Search and review images and results saved to your account." action={<button className="btn-secondary" onClick={() => void apiClient.download("/api/v1/reports/scans.csv", "farmshield-scans.csv")}><Download size={16} />Export CSV</button>} />
    <section className="card mb-5 p-4">
      <div className="grid gap-3 md:grid-cols-[1.4fr_1fr_1fr]">
        <label className="relative"><span className="sr-only">Search scans</span><Search className="absolute left-3 top-3 text-slate-400" size={17} /><input className="field pl-10" placeholder="Search crop or result…" value={search} onChange={(event) => { setPageNumber(1); setSearch(event.target.value); }} /></label>
        <select aria-label="Filter by crop" className="field" value={crop} onChange={(event) => { setPageNumber(1); setCrop(event.target.value); }}><option value="">All crops</option><option value="Tomato">Tomato</option></select>
        <input aria-label="Filter by disease" className="field" placeholder="Filter by disease…" value={disease} onChange={(event) => { setPageNumber(1); setDisease(event.target.value); }} />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-slate-500"><CalendarDays size={16} /><label>From <input aria-label="Start date" className="ml-1 rounded-lg border border-slate-200 px-2 py-1.5" type="date" value={startDate} onChange={(event) => { setPageNumber(1); setStartDate(event.target.value); }} /></label><label>To <input aria-label="End date" className="ml-1 rounded-lg border border-slate-200 px-2 py-1.5" type="date" value={endDate} onChange={(event) => { setPageNumber(1); setEndDate(event.target.value); }} /></label></div>
    </section>
    {error && <div className="mb-5"><ErrorNotice message={error} retry={() => void load()} /></div>}
    {loading ? <LoadingState /> : page?.items.length ? <div className="space-y-3">{page.items.map((scan) => <article key={scan.id} className="card flex flex-wrap items-center gap-4 p-4 sm:flex-nowrap">
      <ScanThumbnail path={scan.image_url} alt={`Leaf photo from ${new Date(scan.created_at).toLocaleDateString()}`} className="h-16 w-16 shrink-0 rounded-xl object-cover" />
      <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h2 className="font-bold">{scan.disease?.name || scan.predicted_class?.replace("Tomato___", "").replaceAll("_", " ") || "No prediction generated"}</h2><StatusBadge status={scan.status} /></div><p className="mt-1 text-sm text-slate-500">{scan.crop}{scan.farm_id ? " · Farm associated" : ""} · {new Date(scan.created_at).toLocaleString()}</p>{scan.warning && <p className="mt-1 line-clamp-1 text-xs text-amber-800">{scan.warning}</p>}</div>
      <div className="flex items-center gap-3">{scan.confidence !== null && <span className="text-sm font-bold">{(scan.confidence * 100).toFixed(1)}%</span>}<button aria-label="Download scan PDF" title="Download report" className="rounded-lg p-2 text-slate-500 hover:bg-slate-50" onClick={() => void apiClient.download(`/api/v1/reports/scans/${scan.id}/pdf`, `farmshield-scan-${scan.id.slice(0, 8)}.pdf`)}><Download size={17} /></button><button aria-label="Delete scan" title="Delete scan" className="rounded-lg p-2 text-slate-500 hover:bg-rose-50 hover:text-rose-700" onClick={() => void remove(scan)}><Trash2 size={17} /></button></div>
    </article>)}
      <div className="flex items-center justify-between py-3 text-sm text-slate-500"><span>{page.total} saved {page.total === 1 ? "scan" : "scans"}</span><div className="flex items-center gap-3"><button disabled={pageNumber <= 1} aria-label="Previous page" className="btn-secondary !p-2" onClick={() => setPageNumber(pageNumber - 1)}><ChevronLeft size={17} /></button><span>Page {pageNumber} of {Math.max(1, Math.ceil(page.total / page.page_size))}</span><button disabled={pageNumber >= Math.ceil(page.total / page.page_size)} aria-label="Next page" className="btn-secondary !p-2" onClick={() => setPageNumber(pageNumber + 1)}><ChevronRight size={17} /></button></div></div>
    </div> : <div className="card p-12 text-center"><CalendarDays className="mx-auto text-leaf" /><h2 className="mt-3 font-bold">No scans match those filters</h2><p className="mt-1 text-sm text-slate-500">Clear a filter or create a scan to start your history.</p></div>}
  </>;
}
