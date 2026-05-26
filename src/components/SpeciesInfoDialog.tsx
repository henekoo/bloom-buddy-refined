import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, ExternalLink } from "lucide-react";

type SpeciesInfo = {
  scientificName: string;
  vernacularName: string | null;
  summary: string | null;
  image: string | null;
  family: string | null;
  wikiUrl: string | null;
  inatUrl: string | null;
};

const cache = new Map<string, SpeciesInfo>();

async function loadInfo(scientificName: string, commonNameFi?: string | null): Promise<SpeciesInfo> {
  const key = scientificName.toLowerCase();
  const ss = sessionStorage.getItem(`species:${key}`);
  if (ss) return JSON.parse(ss);
  if (cache.has(key)) return cache.get(key)!;

  const [inatRes, wikiFi, wikiEn] = await Promise.allSettled([
    fetch(`https://api.inaturalist.org/v1/taxa?q=${encodeURIComponent(scientificName)}&iconic_taxa=Plantae&per_page=1&locale=fi`).then((r) => r.json()),
    fetch(`https://fi.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(commonNameFi || scientificName)}`).then((r) => r.ok ? r.json() : null),
    fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(scientificName)}`).then((r) => r.ok ? r.json() : null),
  ]);

  const inat = inatRes.status === "fulfilled" ? inatRes.value?.results?.[0] : null;
  const wf = wikiFi.status === "fulfilled" ? wikiFi.value : null;
  const we = wikiEn.status === "fulfilled" ? wikiEn.value : null;
  const wiki = wf?.extract ? wf : we;

  const info: SpeciesInfo = {
    scientificName: inat?.name ?? scientificName,
    vernacularName: inat?.preferred_common_name ?? commonNameFi ?? wf?.title ?? null,
    summary: wiki?.extract ?? null,
    image: wiki?.thumbnail?.source ?? inat?.default_photo?.medium_url ?? null,
    family: inat?.ancestors?.find((a: any) => a.rank === "family")?.preferred_common_name ?? inat?.ancestors?.find((a: any) => a.rank === "family")?.name ?? null,
    wikiUrl: wiki?.content_urls?.desktop?.page ?? null,
    inatUrl: inat?.id ? `https://www.inaturalist.org/taxa/${inat.id}` : null,
  };

  cache.set(key, info);
  try { sessionStorage.setItem(`species:${key}`, JSON.stringify(info)); } catch {}
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-auto">
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
          <div className="space-y-4">
            {info.image && (
              <div className="rounded-xl overflow-hidden aspect-video bg-muted">
                <img src={info.image} alt="" className="w-full h-full object-cover" />
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              {info.family && <Badge variant="secondary">Heimo: {info.family}</Badge>}
              <Badge variant="outline">Kasvi</Badge>
            </div>
            {info.summary ? (
              <p className="text-sm leading-relaxed whitespace-pre-line">{info.summary}</p>
            ) : (
              <p className="text-sm text-muted-foreground">Ei kuvausta saatavilla.</p>
            )}
            <div className="flex flex-wrap gap-2 pt-2">
              {info.wikiUrl && (
                <Button asChild variant="outline" size="sm">
                  <a href={info.wikiUrl} target="_blank" rel="noreferrer">
                    Wikipedia <ExternalLink className="h-3.5 w-3.5 ml-1" />
                  </a>
                </Button>
              )}
              {info.inatUrl && (
                <Button asChild variant="outline" size="sm">
                  <a href={info.inatUrl} target="_blank" rel="noreferrer">
                    iNaturalist <ExternalLink className="h-3.5 w-3.5 ml-1" />
                  </a>
                </Button>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
