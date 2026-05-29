import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, ExternalLink, Leaf, Globe, ShieldAlert, Sprout, BookOpen } from "lucide-react";

type SpeciesInfo = {
  scientificName: string;
  vernacularName: string | null;
  summary: string | null;
  image: string | null;
  rank: string | null;
  kingdom: string | null;
  phylum: string | null;
  class: string | null;
  order: string | null;
  family: string | null;
  genus: string | null;
  conservationStatus: string | null;
  nativeStatus: string | null;
  observationsCount: number | null;
  wikiUrl: string | null;
  inatUrl: string | null;
  gbifUrl: string | null;
  otherNames: string[];
};

const cache = new Map<string, SpeciesInfo>();

function ancestor(ancestors: any[] | undefined, rank: string): string | null {
  if (!Array.isArray(ancestors)) return null;
  const a = ancestors.find((x) => x.rank === rank);
  return a?.preferred_common_name || a?.name || null;
}

async function loadInfo(scientificName: string, commonNameFi?: string | null): Promise<SpeciesInfo> {
  const key = scientificName.toLowerCase();
  const ss = sessionStorage.getItem(`species:v2:${key}`);
  if (ss) return JSON.parse(ss);
  if (cache.has(key)) return cache.get(key)!;

  const [inatRes, wikiFi, wikiEn, gbifRes] = await Promise.allSettled([
    fetch(`https://api.inaturalist.org/v1/taxa?q=${encodeURIComponent(scientificName)}&per_page=1&locale=fi&all_names=true`).then((r) => r.json()),
    fetch(`https://fi.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(commonNameFi || scientificName)}`).then((r) => r.ok ? r.json() : null),
    fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(scientificName)}`).then((r) => r.ok ? r.json() : null),
    fetch(`https://api.gbif.org/v1/species/match?name=${encodeURIComponent(scientificName)}&strict=false`).then((r) => r.ok ? r.json() : null),
  ]);

  const inat = inatRes.status === "fulfilled" ? inatRes.value?.results?.[0] : null;
  const wf = wikiFi.status === "fulfilled" ? wikiFi.value : null;
  const we = wikiEn.status === "fulfilled" ? wikiEn.value : null;
  const gbif = gbifRes.status === "fulfilled" ? gbifRes.value : null;
  const wiki = wf?.extract ? wf : we;

  const otherNames: string[] = [];
  if (Array.isArray(inat?.names)) {
    inat.names.slice(0, 6).forEach((n: any) => { if (n.name && !otherNames.includes(n.name)) otherNames.push(n.name); });
  }

  const info: SpeciesInfo = {
    scientificName: inat?.name ?? gbif?.scientificName ?? scientificName,
    vernacularName: inat?.preferred_common_name ?? commonNameFi ?? wf?.title ?? null,
    summary: wiki?.extract ?? null,
    image: wiki?.thumbnail?.source ?? wiki?.originalimage?.source ?? inat?.default_photo?.medium_url ?? null,
    rank: inat?.rank ?? gbif?.rank?.toLowerCase() ?? null,
    kingdom: ancestor(inat?.ancestors, "kingdom") ?? gbif?.kingdom ?? null,
    phylum: ancestor(inat?.ancestors, "phylum") ?? gbif?.phylum ?? null,
    class: ancestor(inat?.ancestors, "class") ?? gbif?.class ?? null,
    order: ancestor(inat?.ancestors, "order") ?? gbif?.order ?? null,
    family: ancestor(inat?.ancestors, "family") ?? gbif?.family ?? null,
    genus: ancestor(inat?.ancestors, "genus") ?? gbif?.genus ?? null,
    conservationStatus: inat?.conservation_status?.status_name ?? inat?.conservation_status?.status ?? null,
    nativeStatus: inat?.native ? "Alkuperäinen" : inat?.introduced ? "Tuotu" : null,
    observationsCount: typeof inat?.observations_count === "number" ? inat.observations_count : null,
    wikiUrl: wiki?.content_urls?.desktop?.page ?? null,
    inatUrl: inat?.id ? `https://www.inaturalist.org/taxa/${inat.id}` : null,
    gbifUrl: gbif?.usageKey ? `https://www.gbif.org/species/${gbif.usageKey}` : null,
    otherNames,
  };

  cache.set(key, info);
  try { sessionStorage.setItem(`species:v2:${key}`, JSON.stringify(info)); } catch {}
  return info;
}

export function SpeciesInfoDialog({
  open, onOpenChange, scientificName, commonNameFi,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  scientificName: string;
  commonNameFi?: string | null;
}) {
  const [info, setInfo] = useState<SpeciesInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !scientificName) return;
    setLoading(true);
    setErr(null);
    setInfo(null);
    loadInfo(scientificName, commonNameFi)
      .then(setInfo)
      .catch((e) => setErr(e instanceof Error ? e.message : "Tietojen haku epäonnistui"))
      .finally(() => setLoading(false));
  }, [open, scientificName, commonNameFi]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">
            {info?.vernacularName ?? commonNameFi ?? scientificName}
          </DialogTitle>
          <DialogDescription className="italic">{info?.scientificName ?? scientificName}</DialogDescription>
        </DialogHeader>

        {loading && (
          <div className="py-12 grid place-items-center text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        )}
        {err && <div className="text-sm text-destructive">{err}</div>}

        {info && (
          <div className="space-y-5">
            {info.image && (
              <div className="rounded-xl overflow-hidden aspect-video bg-muted">
                <img src={info.image} alt="" className="w-full h-full object-cover" />
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              {info.rank && <Badge variant="outline" className="capitalize">{info.rank}</Badge>}
              {info.conservationStatus && (
                <Badge variant="destructive" className="gap-1">
                  <ShieldAlert className="h-3 w-3" /> {info.conservationStatus}
                </Badge>
              )}
              {info.nativeStatus && (
                <Badge variant="secondary" className="gap-1">
                  <Globe className="h-3 w-3" /> {info.nativeStatus}
                </Badge>
              )}
              {info.observationsCount != null && (
                <Badge variant="secondary" className="gap-1">
                  <Sprout className="h-3 w-3" /> iNat: {info.observationsCount.toLocaleString("fi-FI")} havaintoa
                </Badge>
              )}
            </div>

            {info.summary ? (
              <div>
                <h3 className="text-sm font-semibold mb-2 flex items-center gap-1.5"><BookOpen className="h-4 w-4 text-primary" /> Kuvaus</h3>
                <p className="text-sm leading-relaxed whitespace-pre-line">{info.summary}</p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Ei kuvausta saatavilla.</p>
            )}

            {(info.kingdom || info.family || info.genus) && (
              <div>
                <h3 className="text-sm font-semibold mb-2 flex items-center gap-1.5"><Leaf className="h-4 w-4 text-primary" /> Taksonomia</h3>
                <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-2 text-sm rounded-xl border border-border bg-muted/30 p-4">
                  <Row label="Kunta" value={info.kingdom} />
                  <Row label="Pääjakso" value={info.phylum} />
                  <Row label="Luokka" value={info.class} />
                  <Row label="Lahko" value={info.order} />
                  <Row label="Heimo" value={info.family} />
                  <Row label="Suku" value={info.genus} italic />
                </dl>
              </div>
            )}

            {info.otherNames.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold mb-2">Muut nimet</h3>
                <div className="flex flex-wrap gap-1.5">
                  {info.otherNames.map((n) => (
                    <span key={n} className="text-xs px-2 py-0.5 rounded-full bg-accent text-accent-foreground">{n}</span>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
              {info.wikiUrl && (
                <Button asChild variant="outline" size="sm">
                  <a href={info.wikiUrl} target="_blank" rel="noreferrer">Wikipedia <ExternalLink className="h-3.5 w-3.5 ml-1" /></a>
                </Button>
              )}
              {info.inatUrl && (
                <Button asChild variant="outline" size="sm">
                  <a href={info.inatUrl} target="_blank" rel="noreferrer">iNaturalist <ExternalLink className="h-3.5 w-3.5 ml-1" /></a>
                </Button>
              )}
              {info.gbifUrl && (
                <Button asChild variant="outline" size="sm">
                  <a href={info.gbifUrl} target="_blank" rel="noreferrer">GBIF <ExternalLink className="h-3.5 w-3.5 ml-1" /></a>
                </Button>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Row({ label, value, italic }: { label: string; value: string | null; italic?: boolean }) {
  if (!value) return null;
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className={italic ? "italic" : ""}>{value}</dd>
    </div>
  );
}
