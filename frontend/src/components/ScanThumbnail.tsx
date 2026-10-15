import { useEffect, useState } from "react";
import { ImageOff } from "lucide-react";
import { apiClient } from "../lib/api";

export function ScanThumbnail({ path, alt, className = "" }: { path: string; alt: string; className?: string }) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    let alive = true;
    let objectUrl = "";
    apiClient.privateImage(path).then((loaded) => {
      objectUrl = loaded;
      if (alive) setUrl(loaded);
      else URL.revokeObjectURL(loaded);
    }).catch(() => { if (alive) setUrl(""); });
    return () => {
      alive = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [path]);
  if (!url) return <span className={`grid place-items-center bg-slate-100 text-slate-400 ${className}`}><ImageOff size={16} /></span>;
  return <img src={url} alt={alt} className={className} />;
}
