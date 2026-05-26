import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { MapPin, Loader2, X } from "lucide-react";

export type LocationPick = {
  label: string;
  type: "country" | "state" | "city" | "other";
  bbox: [number, number, number, number]; // south, north, west, east
} | null;

async function searchPlaces(q: string, signal?: AbortSignal): Promise<NonNullable<LocationPick>[]> {
  const url = `https://nominatim.openstreetmap.org/search?format=json&countrycodes=fi&addressdetails=1&accept-language=fi&limit=8&q=${encodeURIComponent(q)}`;
  const r = await fetch(url, { signal, headers: { "Accept": "application/json" } });
  if (!r.ok) return [];
  const data = await r.json();
  const out: NonNullable<LocationPick>[] = [];
  for (const item of data) {
    const cls = item.class;
    const type = item.type;
    let kind: NonNullable<LocationPick>["type"] = "other";
    if (cls === "boundary" && (type === "administrative")) {
      const level = Number(item.address?.["ISO3166-2-lvl4"] ? 4 : 0);
      void level;
      kind = item.address?.country && !item.address?.state ? "country"
        : item.address?.state && !item.address?.city && !item.address?.town && !item.address?.village ? "state"
        : "city";
    } else if (cls === "place") {
      kind = "city";
    } else {
      continue;
    }
    if (!item.boundingbox) continue;
    const [s, n, w, e] = item.boundingbox.map(Number) as [number, number, number, number];
    out.push({
      label: item.display_name.split(",").slice(0, 2).join(",").trim(),
      type: kind,
      bbox: [s, n, w, e],
    });
  }
  return out;
}

export function LocationSearch({
  value, onChange, placeholder = "Suomi, maakunta tai kunta…",
}: {
  value: LocationPick;
  onChange: (v: LocationPick) => void;
  placeholder?: string;
}) {
  const [q, setQ] = useState(value?.label ?? "");
  const [debounced, setDebounced] = useState("");
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => { const t = setTimeout(() => setDebounced(q.trim()), 280); return () => clearTimeout(t); }, [q]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const { data, isFetching } = useQuery({
    queryKey: ["places", debounced],
    queryFn: ({ signal }) => searchPlaces(debounced, signal),
    enabled: debounced.length >= 2 && open,
    staleTime: 10 * 60_000,
  });

  return (
    <div ref={wrapRef} className="relative">
      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        value={q}
        onChange={(e) => { setQ(e.target.value); setOpen(true); if (value) onChange(null); }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        className="pl-10 pr-10"
      />
      {(value || q) && (
        <button
          type="button"
          onClick={() => { setQ(""); onChange(null); setOpen(false); }}
          className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 grid place-items-center rounded-full hover:bg-muted"
          aria-label="Tyhjennä"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
      {isFetching && <Loader2 className="absolute right-9 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />}
      {open && debounced.length >= 2 && data && data.length > 0 && (
        <div className="absolute z-50 mt-1 w-full max-h-72 overflow-auto rounded-xl border border-border bg-popover shadow-elegant">
          <button
            type="button"
            onClick={() => { onChange({ label: "Koko Suomi", type: "country", bbox: [59.5, 70.1, 19.0, 31.6] }); setQ("Koko Suomi"); setOpen(false); }}
            className="w-full text-left px-3 py-2 hover:bg-accent text-sm border-b border-border/40"
          >🇫🇮 Koko Suomi</button>
          {data.map((p, i) => (
            <button
              key={i}
              type="button"
              onClick={() => { onChange(p); setQ(p.label); setOpen(false); }}
              className="w-full text-left px-3 py-2 hover:bg-accent border-b border-border/40 last:border-0"
            >
              <div className="text-sm font-medium">{p.label}</div>
              <div className="text-xs text-muted-foreground uppercase">
                {p.type === "state" ? "Maakunta" : p.type === "city" ? "Kunta / paikka" : p.type === "country" ? "Maa" : "Sijainti"}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function inBbox(lat: number, lng: number, bbox: [number, number, number, number]): boolean {
  const [s, n, w, e] = bbox;
  return lat >= s && lat <= n && lng >= w && lng <= e;
}
