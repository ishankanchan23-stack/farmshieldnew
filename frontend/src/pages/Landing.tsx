import { ArrowRight, Check, CloudSun, Eye, Leaf, ScanLine, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { Brand } from "../components/Layout";

const features = [
  { icon: ScanLine, title: "Thoughtful leaf scans", body: "Upload a clear leaf photo and get a transparent result when a configured model is available." },
  { icon: CloudSun, title: "Local weather context", body: "View provider-sourced observations for your farm. Weather alone never becomes a diagnosis." },
  { icon: ShieldCheck, title: "Practical next steps", body: "Explore educational disease notes, prevention guidance, and when to ask an expert." },
];

export function Landing() {
  return <div className="min-h-screen bg-white">
    <header className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8"><Brand /><div className="flex items-center gap-3"><Link to="/login" className="px-3 py-2 text-sm font-bold text-slate-700">Sign in</Link><Link to="/register" className="btn-primary px-4 py-2">Get started <ArrowRight size={16} /></Link></div></header>
    <main>
      <section className="relative overflow-hidden bg-forest text-white">
        <div className="absolute -right-20 top-8 h-96 w-96 rounded-full border border-white/10" /><div className="absolute -right-3 top-24 h-72 w-72 rounded-full border border-white/10" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-5 py-20 md:grid-cols-[1.05fr_.95fr] md:py-28 sm:px-8">
          <div><p className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-lime"><span className="h-1.5 w-1.5 rounded-full bg-lime" /> Transparent crop health support</p>
            <h1 className="max-w-2xl text-4xl font-extrabold leading-[1.12] tracking-tight sm:text-6xl">A clearer view of your crop’s health.</h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-emerald-100">Tools for farmers to document leaf symptoms, understand possible risks, and take a more informed next step.</p>
            <div className="mt-8 flex flex-wrap gap-3"><Link to="/register" className="inline-flex items-center gap-2 rounded-xl bg-lime px-5 py-3 font-bold text-forest hover:bg-white">Analyze your crop <ArrowRight size={17} /></Link><a href="#how-it-works" className="rounded-xl border border-white/25 px-5 py-3 font-semibold text-white hover:bg-white/10">How it works</a></div>
            <p className="mt-5 text-xs text-emerald-200">Designed for tomato crop support · English, हिन्दी, मराठी</p>
          </div>
          <div className="relative mx-auto w-full max-w-lg">
            <div className="absolute inset-5 rounded-[2.5rem] bg-lime/10 blur-xl" />
            <div className="relative overflow-hidden rounded-[2rem] border border-white/15 bg-white/10 p-3 shadow-2xl">
              <div className="relative grid min-h-[350px] place-items-center overflow-hidden rounded-[1.5rem] bg-gradient-to-br from-[#6b9b60] via-[#477e4b] to-[#28593b]">
                <div className="absolute inset-0 opacity-30" style={{ backgroundImage: "radial-gradient(ellipse at 28% 20%, #c3df88 0, transparent 34%), radial-gradient(ellipse at 75% 80%, #183e2b 0, transparent 35%)" }} />
                <div className="relative grid h-56 w-56 -rotate-12 place-items-center rounded-[75%_25%_68%_32%] border border-white/30 bg-gradient-to-br from-[#b8d781] to-[#56844f] shadow-xl">
                  <Leaf size={104} strokeWidth={1} className="rotate-45 text-[#e1efb7]" />
                  <span className="absolute left-9 top-12 h-2 w-2 rounded-full bg-amber-800/70" /><span className="absolute right-12 top-20 h-3 w-3 rounded-full bg-amber-900/60" /><span className="absolute bottom-10 left-16 h-2 w-2 rounded-full bg-amber-900/50" />
                </div>
                <div className="absolute bottom-4 left-4 right-4 rounded-2xl border border-white/50 bg-white/95 p-4 text-ink shadow-lg">
                  <div className="flex items-center justify-between"><span className="flex items-center gap-2 text-sm font-bold"><span className="grid h-7 w-7 place-items-center rounded-lg bg-lime text-forest"><ScanLine size={16} /></span> Scan insight</span><span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-800">Example view</span></div>
                  <p className="mt-3 text-sm font-semibold">Your result is only as helpful as the evidence.</p><p className="mt-1 text-xs leading-5 text-slate-500">Model availability and uncertainty are always shown—not hidden behind a confident-looking score.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-5 py-16 sm:px-8">
        <div className="max-w-2xl"><p className="eyebrow">Built around the farmer</p><h2 className="mt-3 text-3xl font-extrabold tracking-tight">Useful information, without pretending to know more than it does.</h2></div>
        <div className="mt-9 grid gap-5 md:grid-cols-3">{features.map(({ icon: Icon, title, body }) => <article key={title} className="rounded-2xl border border-slate-100 bg-white p-6 shadow-card"><span className="grid h-11 w-11 place-items-center rounded-xl bg-lime text-forest"><Icon size={21} /></span><h3 className="mt-5 text-lg font-bold">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-500">{body}</p></article>)}</div>
      </section>
      <section id="how-it-works" className="bg-cream py-16"><div className="mx-auto max-w-7xl px-5 sm:px-8"><div className="text-center"><p className="eyebrow">A simple workflow</p><h2 className="mt-2 text-3xl font-extrabold">From field observation to next step</h2></div>
        <div className="mt-10 grid gap-4 md:grid-cols-3">{[
          ["01", "Add your farm", "Keep locations and crops organized in one private workspace."],
          ["02", "Capture a leaf", "Use a close, clear image in natural light and associate it with a farm."],
          ["03", "Review with context", "See the model status, educational guidance, and weather observations separately."],
        ].map(([number, title, body]) => <div key={number} className="flex gap-4 rounded-2xl bg-white p-6"><span className="font-extrabold text-leaf">{number}</span><div><h3 className="font-bold">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-500">{body}</p></div></div>)}</div>
      </div></section>
      <section className="mx-auto grid max-w-7xl gap-10 px-5 py-16 md:grid-cols-2 md:items-center sm:px-8">
        <div><p className="eyebrow">AI transparency</p><h2 className="mt-3 text-3xl font-extrabold">No weights? No pretend predictions.</h2><p className="mt-4 leading-7 text-slate-600">FarmShield AI only reports a model prediction when compatible model weights are configured and inference succeeds. A missing model is stated clearly; confidence is not presented as real-world accuracy.</p><ul className="mt-5 space-y-3 text-sm text-slate-700">{["Uncertain predictions are flagged for expert verification", "Disease pages are educational, not confirmed diagnoses", "No unvalidated weather thresholds or pesticide dosages"].map((x) => <li key={x} className="flex gap-2"><Check size={17} className="shrink-0 text-leaf" />{x}</li>)}</ul></div>
        <div className="rounded-3xl bg-forest p-8 text-white"><Eye size={26} className="text-lime" /><h3 className="mt-5 text-xl font-bold">Weather is context, not a verdict.</h3><p className="mt-3 leading-7 text-emerald-100">Current conditions come from the configured weather provider. Potential disease-risk advisories appear only when documented crop-specific rules have been configured.</p><p className="mt-5 text-xs text-emerald-200">Initially focused on tomato · Expandable crop architecture</p></div>
      </section>
    </main>
    <footer className="border-t border-slate-100 bg-white"><div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-7 text-xs text-slate-500 sm:px-8"><Brand /><span>© 2026 FarmShield AI · Detect Today, Healthier Crops Tomorrow.</span><span>Educational decision support only.</span></div></footer>
  </div>;
}
