import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { searchTaxa, type TaxonMatch } from "@/lib/biodiversity";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Search, X, Check } from "lucide-react";

export type TaxonValue = { species: string; scientific_name: string } | null;

export function TaxonSearch({
  species,
  scientificName,
  onChange,
  label = "Laji *",
  required = true,
}: {
  species: string;
  scientificName: string;
  onChange: (v: { species: string; scientific_name: string }) => void;
  label?: string;
  required?: boolean;
}) {
  const [q, setQ] = useState(species ? `${species}${scientificName ? ` (${scientificName})` : ""}` : (scientificName || ""));
  const [debounced, setDebounced] = useState("");
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<boolean>(!!(species || scientificName));
  const wrapRef = useRef<HTMLDivElement>(null);

  // Sync when species/scientificName are set externally (e.g. PlantNet pick)
  useEffect(() => {
    if (species || scientificName) {
      const label = species
        ? `${species}${scientificName ? ` (${scientificName})` : ""}`
        : scientificName;
      setQ(label);
      setPicked(true);
      setOpen(false);
    }
  }, [species, scientificName]);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(q.trim()), 220);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const { data, isFetching } = useQuery({
    queryKey: ["taxa-pick", debounced],
    queryFn: ({ signal }) => searchTaxa(debounced, signal),
    enabled: debounced.length >= 2 && open && !picked,
    staleTime: 5 * 60_000,
  });

  const pick = (t: TaxonMatch) => {
    const common = t.vernacularName ?? t.scientificName;
    onChange({ species: common, scientific_name: t.scientificName });
    setQ(`${common} (${t.scientificName})`);
    setPicked(true);
    setOpen(false);
  };

  const clear = () => {
    onChange({ species: "", scientific_name: "" });
    setQ("");
    setPicked(false);
    setOpen(true);
  };

  return (
    <div ref={wrapRef} className="relative sm:col-span-2">
      <Label>{label}</Label>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          required={required && !picked}
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPicked(false);
            setOpen(true);
            // Clear stored values while user is typing — must pick
            if (species || scientificName) onChange({ species: "", scientific_name: "" });
          }}
          onFocus={() => setOpen(true)}
          placeholder="Kirjoita lajin nimi ja valitse listasta…"
          className="pl-10 pr-10"
        />
        {picked ? (
          <button
            type="button"
            onClick={clear}
            className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 rounded-full hover:bg-muted grid place-items-center"
            aria-label="Tyhjennä"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : (
          isFetching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
        {picked && (
          <Check className="absolute right-10 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
        )}
      </div>
      {!picked && open && debounced.length >= 2 && data && data.length > 0 && (
        <div className="absolute z-50 mt-1 w-full max-h-72 overflow-auto rounded-xl border border-border bg-popover shadow-elegant">
          {data.map((t) => (
            <button
              key={`${t.scientificName}-${t.gbifKey ?? ""}-${t.inatId ?? ""}`}
              type="button"
              onClick={() => pick(t)}
              className="w-full text-left px-3 py-2 hover:bg-accent flex items-center gap-3 border-b border-border/40 last:border-0"
            >
              {t.thumbnail ? (
                <img src={t.thumbnail} alt="" className="h-9 w-9 rounded-lg object-cover shrink-0" />
              ) : (
                <div className="h-9 w-9 rounded-lg bg-accent grid place-items-center text-base shrink-0">🌿</div>
              )}
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium truncate">{t.vernacularName ?? t.scientificName}</div>
                <div className="text-xs text-muted-foreground italic truncate">{t.scientificName}{t.family ? ` · ${t.family}` : ""}</div>
              </div>
            </button>
          ))}
        </div>
      )}
      {!picked && open && debounced.length >= 2 && !isFetching && data && data.length === 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-xl border border-border bg-popover p-3 text-sm text-muted-foreground shadow-elegant">
          Ei tuloksia — tarkista kirjoitusasu.
        </div>
      )}
      <p className="mt-1 text-xs text-muted-foreground">Laji on valittava ehdotuslistasta.</p>
    </div>
  );
}
