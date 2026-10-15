import type { ReactNode } from "react";
import { AlertCircle, ArrowRight, CheckCircle2, Leaf, LoaderCircle } from "lucide-react";
import { useTranslation } from "../app/i18n-context";

export function PageHeading({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}
        <h1 className="text-2xl font-extrabold tracking-tight text-ink sm:text-[30px]">{title}</h1>
        {description && <p className="mt-1.5 max-w-2xl text-sm text-slate-500">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function ErrorNotice({ message, retry }: { message: string; retry?: () => void }) {
  return <div role="alert" className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
    <AlertCircle className="mt-0.5 shrink-0" size={18} />
    <div className="flex-1">{message}{retry && <button onClick={retry} className="ml-3 font-bold underline">Try again</button>}</div>
  </div>;
}

export function LoadingState({ label = "Loading your farm data…" }: { label?: string }) {
  return <div role="status" className="flex min-h-40 items-center justify-center gap-3 text-sm text-slate-500"><LoaderCircle className="animate-spin text-leaf" />{label}</div>;
}

export function EmptyState({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return <div className="card flex min-h-64 flex-col items-center justify-center px-6 py-12 text-center">
    <span className="mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-lime text-forest"><Leaf size={22} /></span>
    <h3 className="font-bold text-ink">{title}</h3><p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">{body}</p>
    {action && <div className="mt-5">{action}</div>}
  </div>;
}

export function StatusBadge({ status }: { status: string }) {
  const classes: Record<string, string> = {
    classified: "bg-emerald-50 text-emerald-800",
    uncertain: "bg-amber-50 text-amber-800",
    unavailable: "bg-slate-100 text-slate-700",
    error: "bg-rose-50 text-rose-800",
  };
  const label = status === "classified" ? "Classified" : status === "uncertain" ? "Review recommended" : status === "error" ? "Analysis issue" : "Model unavailable";
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${classes[status] || "bg-slate-100 text-slate-700"}`}>{label}</span>;
}

export function TransparentModelNote() {
  const t = useTranslation();
  return <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
    <AlertCircle size={18} className="mt-0.5 shrink-0" /><p><strong>{t.demo}</strong> {t.demoDetails}</p>
  </div>;
}

export function GoodSignal({ children }: { children: ReactNode }) {
  return <span className="inline-flex items-center gap-1.5 text-sm text-emerald-800"><CheckCircle2 size={16} />{children}</span>;
}

export function ArrowLink({ children }: { children: ReactNode }) {
  return <span className="inline-flex items-center gap-2">{children}<ArrowRight size={16} /></span>;
}
