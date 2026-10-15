import { useEffect, useRef, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { AlertTriangle, Camera, Check, Download, ImagePlus, LoaderCircle, RotateCcw, ScanLine, Trash2, X } from "lucide-react";
import { apiClient, errorMessage } from "../lib/api";
import { ErrorNotice, PageHeading, StatusBadge, TransparentModelNote } from "../components/ui";
import type { Farm, Scan } from "../types";
import { validateImageFile } from "../utils/scanner-validation";
import { useTranslation } from "../app/i18n-context";

const scannerSchema = z.object({ crop: z.string().min(2, "Choose a crop.").max(80), farmId: z.string().optional() });
type ScannerValues = z.infer<typeof scannerSchema>;

export function Scanner() {
  const [farms, setFarms] = useState<Farm[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [result, setResult] = useState<Scan | null>(null);
  const [error, setError] = useState("");
  const [fileError, setFileError] = useState("");
  const [busy, setBusy] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const { register, handleSubmit, formState: { errors } } = useForm<ScannerValues>({
    resolver: zodResolver(scannerSchema),
    defaultValues: { crop: "Tomato", farmId: "" },
  });
  useEffect(() => { apiClient.farms().then(setFarms).catch((failure) => setError(errorMessage(failure))); }, []);
  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    // Keep the created browser URL in state and revoke it in this effect's cleanup.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  useEffect(() => {
    if (videoRef.current && streamRef.current) videoRef.current.srcObject = streamRef.current;
  }, [cameraOpen]);
  useEffect(() => () => stopCamera(), []);

  function stopCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }

  function chooseFile(candidate?: File) {
    if (!candidate) return;
    const message = validateImageFile(candidate);
    setFileError(message || "");
    if (message) return;
    setFile(candidate);
    setResult(null);
    setError("");
  }

  async function openCamera() {
    setCameraError("");
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError("Camera access is unavailable in this browser. Use the image upload instead.");
      return;
    }
    try {
      streamRef.current = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
      setCameraOpen(true);
    } catch {
      setCameraError("Camera permission was denied or no camera is available. You can still upload a photo.");
    }
  }

  function capture() {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0) {
      setCameraError("The camera is still starting. Please try again in a moment.");
      return;
    }
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext("2d");
    if (!context) {
      setCameraError("Could not capture the camera frame. Please upload a photo instead.");
      return;
    }
    context.drawImage(video, 0, 0);
    canvas.toBlob((blob) => {
      if (blob) chooseFile(new File([blob], `farmshield-${Date.now()}.jpg`, { type: "image/jpeg" }));
    }, "image/jpeg", 0.9);
    stopCamera();
    setCameraOpen(false);
  }

  async function submit(values: ScannerValues) {
    if (!file) { setFileError("Add a leaf image before starting the analysis."); return; }
    setBusy(true);
    setError("");
    try { setResult(await apiClient.analyze(file, values.crop, values.farmId || undefined)); }
    catch (failure) { setError(errorMessage(failure)); }
    finally { setBusy(false); }
  }

  function resetScan() {
    setFile(null);
    setResult(null);
    setError("");
    setFileError("");
  }

  return <>
    <PageHeading eyebrow="Field image analysis" title="Leaf scanner" description="Capture a clear leaf photo and review the model status, result, and educational guidance." />
    {error && <div className="mb-5"><ErrorNotice message={error} /></div>}
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(310px,.7fr)]">
      <section className="card p-5 sm:p-7">
        <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-lime text-forest"><ScanLine size={20} /></span><div><h2 className="font-bold">Add an observation</h2><p className="text-xs text-slate-500">Images are validated and reoriented before inference.</p></div></div>
        <form onSubmit={handleSubmit(submit)} className="mt-6 space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-semibold">Crop<select className="field mt-2" {...register("crop")}><option value="Tomato">Tomato</option></select>{errors.crop && <span className="mt-1 block text-xs text-rose-700">{errors.crop.message}</span>}</label>
            <label className="block text-sm font-semibold">Farm <span className="font-normal text-slate-400">(optional)</span><select className="field mt-2" {...register("farmId")}><option value="">Not associated</option>{farms.map((farm) => <option key={farm.id} value={farm.id}>{farm.name}</option>)}</select>{errors.farmId && <span className="mt-1 block text-xs text-rose-700">{errors.farmId.message}</span>}</label>
          </div>
          {farms.length === 0 && <p className="text-xs text-slate-500">Add a farm first if you want to attach a location to this scan.</p>}
          {file && preview ? <div className="relative overflow-hidden rounded-2xl bg-slate-50">
            <img src={preview} alt="Selected crop leaf preview" className="mx-auto max-h-[440px] w-full object-contain" />
            <div className="absolute right-3 top-3 flex gap-2"><label className="cursor-pointer rounded-lg bg-white/95 p-2 text-slate-600 shadow hover:text-forest" title="Replace image"><ImagePlus size={17} /><input aria-label="Replace selected image" className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => chooseFile(event.target.files?.[0])} /></label><button type="button" onClick={resetScan} aria-label="Remove selected image" className="rounded-lg bg-white/95 p-2 text-slate-600 shadow hover:text-rose-700"><Trash2 size={17} /></button></div>
            <span className="absolute bottom-3 left-3 rounded-lg bg-white/95 px-3 py-1.5 text-xs font-semibold shadow">{file?.name}</span>
          </div> : <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-[#fbfcf9] px-5 py-12 text-center">
            <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-lime/60 text-forest"><ImagePlus size={22} /></span>
            <h3 className="mt-4 font-bold">Add a leaf photo</h3><p className="mx-auto mt-1 max-w-sm text-sm leading-6 text-slate-500">Use JPEG, PNG, or WEBP · up to 8 MB. A close, well-lit image works best.</p>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              <label className="btn-secondary cursor-pointer"><ImagePlus size={16} />Choose image<input aria-label="Upload a leaf image" className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => chooseFile(event.target.files?.[0])} /></label>
              <button type="button" className="btn-secondary" onClick={() => void openCamera()}><Camera size={16} />Use camera</button>
            </div>
          </div>}
          {fileError && <p role="alert" className="text-sm text-rose-700">{fileError}</p>}
          {cameraError && <p role="alert" className="text-sm text-rose-700">{cameraError}</p>}
          {file && <div className="flex flex-wrap gap-2"><button disabled={busy} className="btn-primary"><ScanLine size={17} />{busy ? "Analyzing image…" : "Analyze image"}{busy && <LoaderCircle className="animate-spin" size={16} />}</button><button type="button" disabled={busy} className="btn-secondary" onClick={() => void openCamera()}><RotateCcw size={16} />Retake image</button></div>}
        </form>
      </section>
      <aside className="space-y-5">
        {!result ? <div className="card p-5"><p className="eyebrow">Before you scan</p><h2 className="mt-2 font-bold">A little care makes a clearer observation</h2><ul className="mt-4 space-y-3 text-sm leading-5 text-slate-600">{["Photograph one affected leaf in natural light.", "Keep the camera steady and focus on the leaf surface.", "Avoid harsh shadows, glare, and busy backgrounds.", "Compare results with the whole plant and local advice."].map((tip) => <li key={tip} className="flex gap-2"><Check size={16} className="mt-0.5 shrink-0 text-leaf" />{tip}</li>)}</ul></div> : <ScanResult result={result} onReset={resetScan} />}
        <div className="rounded-2xl border border-slate-200 bg-white p-5"><h3 className="text-sm font-bold">How to interpret a result</h3><p className="mt-2 text-xs leading-5 text-slate-500">Model confidence reflects the classifier output—not proven real-world diagnostic accuracy. A low-confidence result needs expert verification. This tool does not assess severity or prescribe chemicals.</p></div>
      </aside>
    </div>
    {cameraOpen && <div role="dialog" aria-modal="true" aria-label="Camera capture" className="fixed inset-0 z-50 grid place-items-center bg-ink/70 p-4">
      <div className="w-full max-w-xl rounded-2xl bg-white p-4 shadow-xl"><div className="mb-3 flex items-center justify-between"><h2 className="font-bold">Capture a leaf photo</h2><button aria-label="Close camera" onClick={() => { stopCamera(); setCameraOpen(false); }}><X /></button></div>
        <video ref={videoRef} autoPlay playsInline className="max-h-[65vh] w-full rounded-xl bg-black object-contain" />
        <button onClick={capture} className="btn-primary mt-4 w-full"><Camera size={17} />Capture image</button>
      </div>
    </div>}
  </>;
}

function ScanResult({ result, onReset }: { result: Scan; onReset: () => void }) {
  const t = useTranslation();
  return <div className="card overflow-hidden">
    <div className="border-b border-slate-100 p-5"><div className="flex items-center justify-between"><p className="eyebrow">Scan result</p><StatusBadge status={result.status} /></div><h2 className="mt-2 text-xl font-extrabold">{result.disease?.name || result.predicted_class?.replace("Tomato___", "").replaceAll("_", " ") || "No prediction available"}</h2><p className="mt-1 text-xs text-slate-500">{new Date(result.created_at).toLocaleString()} · {result.model_name}</p></div>
    <div className="space-y-4 p-5">
      {result.status === "unavailable" && <TransparentModelNote />}
      {result.status === "uncertain" && <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"><AlertTriangle size={17} className="mr-2 inline" />{t.uncertainty}</div>}
      {result.status === "classified" && <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">Model confidence—not diagnostic accuracy</p><p className="mt-1 text-xl font-extrabold">{result.confidence === null ? "—" : `${(result.confidence * 100).toFixed(1)}%`}</p></div>}
      {result.warning && <p className="text-sm text-amber-800">{result.warning}</p>}
      {result.disease && <div className="space-y-3 text-sm"><Info title="Symptoms" body={result.disease.symptoms} /><Info title="Prevention" body={result.disease.prevention} /><Info title="Safe next steps" body={result.disease.next_steps} /><p className="text-xs text-slate-400">Educational information · Source: {result.disease.source}</p></div>}
      <div className="flex flex-wrap gap-2"><button className="btn-secondary flex-1" onClick={() => void apiClient.download(`/api/v1/reports/scans/${result.id}/pdf`, `farmshield-scan-${result.id.slice(0, 8)}.pdf`)}><Download size={16} />Download report</button><button className="btn-secondary flex-1" onClick={onReset}><RotateCcw size={16} />Retake image</button><button className="btn-primary flex-1" onClick={onReset}><ScanLine size={16} />Analyze another leaf</button></div>
    </div>
  </div>;
}

function Info({ title, body }: { title: string; body: string }) {
  return <div><h3 className="mb-1 font-bold">{title}</h3><p className="leading-5 text-slate-600">{body}</p></div>;
}
