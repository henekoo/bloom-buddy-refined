import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  searchTaxa,
  resolveTaxon,
  fetchObservations,
  type TaxonMatch,
  type UnifiedObservation,
  type Source,
} from "@/lib/biodiversity";
import { ExploreMap } from "@/components/ExploreMap";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  Layers,
  Flame,
  MapPin,
  Sparkles,
  Database,
  Bird,
  Calendar,
  ExternalLink,
  X,
  Sun,
  Moon,
  Satellite,
  Loader2,
  Filter,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/explore")({ component: ExplorePage });

const SUGGESTIONS = [
  "Vuorijalava",
  "Tammi",
  "Lehmus",
  "Metsävaahtera",
  "Siperianpihta",
  "Tervaleppä",
  "Mustikka",
  "Kanerva",
  "Suopursu",
];

function ExplorePage() {
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [activeTaxon, setActiveTaxon] = useState<TaxonMatch | null>(null);
  const [mode, setMode] = useState<"cluster" | "heat">("cluster");
  const [basemap, setBasemap] = useState<"map" | "satellite" | "dark">("map");
  const [sources, setSources] = useState<Record<Source, boolean>>({ gbif: true, inaturalist: true });
  const [onlyResearch, setOnlyResearch] = useState(false);
  const [onlyWild, setOnlyWild] = useState(false);
  const [withImage, setWithImage] = useState(false);
  const [yearRange, setYearRange] = useState<[number, number]>([2000, new Date().getFullYear()]);
  const [selected, setSelected] = useState<UnifiedObservation | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(query.trim()), 220);
    return () => clearTimeout(id);
  }, [query]);

  const suggestionsQ = useQuery({
    queryKey: ["taxon-suggest", debounced],
    queryFn: ({ signal }) => searchTaxa(debounced, signal),
    enabled: debounced.length >= 2 && !activeTaxon,
    staleTime: 5 * 60_000,
  });

  const observationsQ = useQuery({
    queryKey: ["observations", activeTaxon?.scientificName, activeTaxon?.gbifKey, activeTaxon?.inatId],
    queryFn: ({ signal }) => fetchObservations(activeTaxon!, signal),
    enabled: !!activeTaxon,
    staleTime: 10 * 60_000,
  });

  const all = observationsQ.data ?? [];

  const filtered = useMemo(() => {
    return all.filter((o) => {
      if (!sources[o.source]) return false;
      if (onlyResearch && o.identificationConfidence !== "research") return false;
      if (onlyWild && o.isWild === false) return false;
      if (withImage && !o.image) return false;
      if (o.observedAt) {
        const y = new Date(o.observedAt).getFullYear();
        if (!Number.isNaN(y) && (y < yearRange[0] || y > yearRange[1])) return false;
      }
      return true;
    });
  }, [all, sources, onlyResearch, onlyWild, withImage, yearRange]);

  const stats = useMemo(() => {
    const bySource: Record<string, number> = {};
    const byYear: Record<string, number> = {};
    let withImg = 0;
    for (const o of filtered) {
      bySource[o.source] = (bySource[o.source] ?? 0) + 1;
      if (o.observedAt) {
        const y = String(new Date(o.observedAt).getFullYear());
        if (y !== "NaN") byYear[y] = (byYear[y] ?? 0) + 1;
      }
      if (o.image) withImg++;
    }
    return { bySource, byYear, withImg };
  }, [filtered]);

  const handlePick = async (t: TaxonMatch) => {
    if (!t.gbifKey || !t.inatId) {
      const resolved = await resolveTaxon(t.scientificName);
      setActiveTaxon({ ...t, gbifKey: t.gbifKey ?? resolved?.gbifKey, inatId: t.inatId ?? resolved?.inatId, vernacularName: t.vernacularName ?? resolved?.vernacularName ?? null, thumbnail: t.thumbnail ?? resolved?.thumbnail ?? null, family: t.family ?? resolved?.family ?? null });
    } else {
      setActiveTaxon(t);
    }
    setQuery(t.vernacularName ?? t.scientificName);
    setSelected(null);
  };

  const reset = () => {
    setActiveTaxon(null);
    setQuery("");
    setSelected(null);
    inputRef.current?.focus();
  };

  return (
    <div className="-mx-4 md:-mx-8 -my-4 md:-my-8 h-[calc(100vh-3.5rem)] md:h-screen relative overflow-hidden bg-background">
      {/* MAP fills everything */}
      <div className="absolute inset-0">
        <ExploreMap
          observations={filtered}
          mode={mode}
          basemap={basemap}
          onSelect={setSelected}
          height="100%"
        />
      </div>

      {/* SEARCH OVERLAY */}
      <div className="absolute top-4 left-4 right-4 md:right-auto md:w-[420px] z-[500]">
        <div className="rounded-2xl shadow-2xl backdrop-blur-xl bg-card/85 border border-border/60 overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border/60">
            <div className="h-9 w-9 rounded-xl gradient-leaf grid place-items-center shadow-leaf shrink-0">
              <Sparkles className="h-4 w-4 text-primary-foreground" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
                Biodiversity Explorer
              </div>
              <div className="text-sm font-semibold truncate">
                {activeTaxon ? activeTaxon.vernacularName ?? activeTaxon.scientificName : "Etsi kasvilajia"}
              </div>
            </div>
            {activeTaxon && (
              <Button variant="ghost" size="icon" onClick={reset} className="h-8 w-8 shrink-0">
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              ref={inputRef}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                if (activeTaxon) setActiveTaxon(null);
              }}
              placeholder="esim. Vuorijalava, Quercus robur, Tammi…"
              className="pl-11 h-12 rounded-none border-0 border-b border-border/60 focus-visible:ring-0"
            />
            {suggestionsQ.isFetching && (
              <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
            )}
          </div>

          {/* Suggestions */}
          {!activeTaxon && debounced.length >= 2 && suggestionsQ.data && (
            <div className="max-h-72 overflow-auto">
              {suggestionsQ.data.length === 0 && !suggestionsQ.isFetching && (
                <div className="px-4 py-6 text-sm text-muted-foreground text-center">Ei tuloksia</div>
              )}
              {suggestionsQ.data.map((t) => (
                <button
                  key={`${t.scientificName}-${t.gbifKey ?? ""}-${t.inatId ?? ""}`}
                  onClick={() => handlePick(t)}
                  className="w-full text-left px-4 py-2.5 hover:bg-accent/50 transition-colors flex items-center gap-3 border-b border-border/40 last:border-0"
                >
                  {t.thumbnail ? (
                    <img src={t.thumbnail} alt="" className="h-10 w-10 rounded-lg object-cover shrink-0" />
                  ) : (
                    <div className="h-10 w-10 rounded-lg bg-accent grid place-items-center shrink-0">
                      <Bird className="h-4 w-4 text-primary" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">
                      {t.vernacularName ?? t.scientificName}
                    </div>
                    <div className="text-xs text-muted-foreground italic truncate">
                      {t.scientificName}
                      {t.family ? ` · ${t.family}` : ""}
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    {t.gbifKey && <span className="h-2 w-2 rounded-full bg-green-500" title="GBIF" />}
                    {t.inatId && <span className="h-2 w-2 rounded-full bg-sky-500" title="iNaturalist" />}
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Empty state suggestions */}
          {!activeTaxon && debounced.length < 2 && (
            <div className="p-4">
              <div className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-2 flex items-center gap-1">
                <TrendingUp className="h-3 w-3" /> Suositukset
              </div>
              <div className="flex flex-wrap gap-1.5">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => setQuery(s)}
                    className="text-xs px-2.5 py-1 rounded-full bg-accent hover:bg-primary hover:text-primary-foreground transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Active stats */}
          {activeTaxon && (
            <div className="px-4 py-3 bg-gradient-to-br from-primary/5 to-transparent">
              {observationsQ.isLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Haetaan havaintoja…
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-baseline gap-2">
                    <div className="text-2xl font-bold tabular-nums">{filtered.length.toLocaleString("fi-FI")}</div>
                    <div className="text-xs text-muted-foreground">/ {all.length} havaintoa Suomessa</div>
                  </div>
                  <div className="flex flex-wrap gap-1.5 text-[11px]">
                    <Badge variant="secondary" className="gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                      GBIF {stats.bySource.gbif ?? 0}
                    </Badge>
                    <Badge variant="secondary" className="gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-sky-500" />
                      iNaturalist {stats.bySource.inaturalist ?? 0}
                    </Badge>
                    <Badge variant="secondary">{stats.withImg} kuvaa</Badge>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Filters panel */}
        {activeTaxon && (
          <>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowFilters((v) => !v)}
              className="mt-2 backdrop-blur-xl bg-card/85 border border-border/60 shadow-lg"
            >
              <Filter className="h-3.5 w-3.5 mr-1.5" />
              Suodattimet
            </Button>
            {showFilters && (
              <div className="mt-2 rounded-2xl shadow-2xl backdrop-blur-xl bg-card/90 border border-border/60 p-4 space-y-4 text-sm">
                <div>
                  <div className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-2">Lähteet</div>
                  <div className="flex gap-2">
                    {(["gbif", "inaturalist"] as Source[]).map((s) => (
                      <button
                        key={s}
                        onClick={() => setSources((p) => ({ ...p, [s]: !p[s] }))}
                        className={cn(
                          "flex-1 px-3 py-2 rounded-lg border text-xs font-medium transition-all",
                          sources[s]
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border bg-background text-muted-foreground",
                        )}
                      >
                        <span
                          className={cn(
                            "inline-block h-2 w-2 rounded-full mr-1.5",
                            s === "gbif" ? "bg-green-500" : "bg-sky-500",
                          )}
                        />
                        {s === "gbif" ? "GBIF" : "iNaturalist"}
                      </button>
                    ))}
                  </div>
                </div>
                <label className="flex items-center justify-between cursor-pointer">
                  <span>Vain research-grade</span>
                  <input type="checkbox" checked={onlyResearch} onChange={(e) => setOnlyResearch(e.target.checked)} className="h-4 w-4 accent-primary" />
                </label>
                <label className="flex items-center justify-between cursor-pointer">
                  <span>Vain villit havainnot</span>
                  <input type="checkbox" checked={onlyWild} onChange={(e) => setOnlyWild(e.target.checked)} className="h-4 w-4 accent-primary" />
                </label>
                <label className="flex items-center justify-between cursor-pointer">
                  <span>Vain havainnot kuvalla</span>
                  <input type="checkbox" checked={withImage} onChange={(e) => setWithImage(e.target.checked)} className="h-4 w-4 accent-primary" />
                </label>
                <div>
                  <div className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-2 flex justify-between">
                    <span>Vuodet</span>
                    <span className="tabular-nums">{yearRange[0]} – {yearRange[1]}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="range" min={1900} max={new Date().getFullYear()} value={yearRange[0]}
                      onChange={(e) => setYearRange([Math.min(+e.target.value, yearRange[1]), yearRange[1]])}
                      className="flex-1 accent-primary"
                    />
                    <input
                      type="range" min={1900} max={new Date().getFullYear()} value={yearRange[1]}
                      onChange={(e) => setYearRange([yearRange[0], Math.max(+e.target.value, yearRange[0])])}
                      className="flex-1 accent-primary"
                    />
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* TOP-RIGHT CONTROLS */}
      <div className="absolute top-4 right-4 z-[500] flex flex-col gap-2">
        <div className="rounded-xl shadow-2xl backdrop-blur-xl bg-card/85 border border-border/60 p-1 flex gap-1">
          <button
            onClick={() => setMode("cluster")}
            className={cn("p-2 rounded-lg transition-colors", mode === "cluster" ? "bg-primary text-primary-foreground" : "hover:bg-accent")}
            title="Klusterit"
          >
            <Layers className="h-4 w-4" />
          </button>
          <button
            onClick={() => setMode("heat")}
            className={cn("p-2 rounded-lg transition-colors", mode === "heat" ? "bg-primary text-primary-foreground" : "hover:bg-accent")}
            title="Lämpökartta"
          >
            <Flame className="h-4 w-4" />
          </button>
        </div>
        <div className="rounded-xl shadow-2xl backdrop-blur-xl bg-card/85 border border-border/60 p-1 flex flex-col gap-1">
          <button
            onClick={() => setBasemap("map")}
            className={cn("p-2 rounded-lg transition-colors", basemap === "map" ? "bg-primary text-primary-foreground" : "hover:bg-accent")}
            title="Kartta"
          >
            <Sun className="h-4 w-4" />
          </button>
          <button
            onClick={() => setBasemap("satellite")}
            className={cn("p-2 rounded-lg transition-colors", basemap === "satellite" ? "bg-primary text-primary-foreground" : "hover:bg-accent")}
            title="Satelliitti"
          >
            <Satellite className="h-4 w-4" />
          </button>
          <button
            onClick={() => setBasemap("dark")}
            className={cn("p-2 rounded-lg transition-colors", basemap === "dark" ? "bg-primary text-primary-foreground" : "hover:bg-accent")}
            title="Tumma"
          >
            <Moon className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* OBSERVATION DETAIL CARD */}
      {selected && (
        <div className="absolute bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-[380px] z-[500] animate-fade-in">
          <div className="rounded-2xl shadow-2xl backdrop-blur-xl bg-card/95 border border-border/60 overflow-hidden">
            {selected.image && (
              <div className="relative h-48 bg-muted">
                <img src={selected.image} alt="" className="w-full h-full object-cover" />
                <button
                  onClick={() => setSelected(null)}
                  className="absolute top-2 right-2 h-8 w-8 grid place-items-center rounded-full bg-black/60 text-white hover:bg-black/80"
                >
                  <X className="h-4 w-4" />
                </button>
                <Badge className="absolute top-2 left-2 backdrop-blur bg-black/60 text-white border-0">
                  {selected.source}
                </Badge>
              </div>
            )}
            <div className="p-4 space-y-3">
              {!selected.image && (
                <div className="flex justify-between items-start">
                  <Badge variant="secondary">{selected.source}</Badge>
                  <Button variant="ghost" size="icon" className="h-7 w-7 -mt-1 -mr-1" onClick={() => setSelected(null)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
              <div>
                <div className="font-semibold leading-tight">
                  {selected.vernacularName ?? selected.scientificName}
                </div>
                <div className="text-xs italic text-muted-foreground">{selected.scientificName}</div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {selected.observedAt && (
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Calendar className="h-3 w-3" /> {selected.observedAt}
                  </div>
                )}
                {selected.recordedBy && (
                  <div className="flex items-center gap-1.5 text-muted-foreground truncate">
                    <Bird className="h-3 w-3" /> {selected.recordedBy}
                  </div>
                )}
                {selected.locality && (
                  <div className="flex items-center gap-1.5 text-muted-foreground col-span-2 truncate">
                    <MapPin className="h-3 w-3" /> {selected.locality}
                  </div>
                )}
                <div className="flex items-center gap-1.5 text-muted-foreground col-span-2">
                  <Database className="h-3 w-3" />
                  {selected.lat.toFixed(5)}, {selected.lng.toFixed(5)}
                </div>
              </div>
              {selected.identificationConfidence && (
                <Badge variant={selected.identificationConfidence === "research" ? "default" : "secondary"} className="text-[10px]">
                  {selected.identificationConfidence}
                </Badge>
              )}
              <a
                href={selected.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-1.5 w-full text-sm py-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
              >
                Avaa alkuperäisessä lähteessä <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* LOADING OVERLAY */}
      {activeTaxon && observationsQ.isLoading && (
        <div className="absolute inset-0 grid place-items-center z-[400] pointer-events-none">
          <div className="backdrop-blur-xl bg-card/80 border border-border/60 rounded-2xl px-6 py-4 shadow-2xl flex items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <div>
              <div className="text-sm font-medium">Aggregoidaan havaintoja…</div>
              <div className="text-xs text-muted-foreground">GBIF · iNaturalist</div>
            </div>
          </div>
        </div>
      )}

      {/* LEGEND */}
      <div className="absolute bottom-4 left-4 z-[400] hidden md:block">
        <div className="rounded-xl backdrop-blur-xl bg-card/80 border border-border/60 px-3 py-2 text-[11px] shadow-lg">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-green-500" /> GBIF
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-sky-500" /> iNaturalist
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
