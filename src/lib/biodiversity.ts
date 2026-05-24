// Unified biodiversity client. Aggregates plant observations from GBIF and
// iNaturalist (both CORS-enabled, free public APIs). Filters to Finland.
//
// All requests fired client-side; React Query handles caching + dedup.

export type Source = "gbif" | "inaturalist";

export type UnifiedObservation = {
  id: string;
  source: Source;
  sourceUrl: string;
  lat: number;
  lng: number;
  observedAt: string | null;
  recordedBy: string | null;
  scientificName: string;
  vernacularName: string | null;
  image: string | null;
  images: string[];
  locality: string | null;
  basisOfRecord: string | null;
  isWild: boolean | null;
  identificationConfidence: "research" | "needs_id" | "casual" | null;
  taxonKey?: number;
};

export type TaxonMatch = {
  scientificName: string;
  vernacularName?: string | null;
  rank?: string | null;
  gbifKey?: number;
  inatId?: number;
  kingdom?: string | null;
  family?: string | null;
  thumbnail?: string | null;
  synonyms?: string[];
};

const FI_PLACE_ID = 7020; // iNaturalist Finland
const GBIF_FI = "FI";

// ---------- TAXON RESOLUTION ----------

export async function searchTaxa(query: string, signal?: AbortSignal): Promise<TaxonMatch[]> {
  const q = query.trim();
  if (!q) return [];

  // Query both providers in parallel
  const [gbifRes, inatRes] = await Promise.allSettled([
    fetch(
      `https://api.gbif.org/v1/species/suggest?q=${encodeURIComponent(q)}&rank=SPECIES&limit=8&kingdomKey=6`,
      { signal },
    ).then((r) => r.json()),
    fetch(
      `https://api.inaturalist.org/v1/taxa/autocomplete?q=${encodeURIComponent(q)}&iconic_taxa=Plantae&locale=fi&per_page=8`,
      { signal },
    ).then((r) => r.json()),
  ]);

  const map = new Map<string, TaxonMatch>();

  if (gbifRes.status === "fulfilled" && Array.isArray(gbifRes.value)) {
    for (const t of gbifRes.value) {
      if (!t.scientificName) continue;
      const key = t.canonicalName?.toLowerCase() ?? t.scientificName.toLowerCase();
      map.set(key, {
        scientificName: t.canonicalName ?? t.scientificName,
        vernacularName: t.vernacularName ?? null,
        rank: t.rank,
        gbifKey: t.key,
        kingdom: t.kingdom,
        family: t.family,
      });
    }
  }

  if (inatRes.status === "fulfilled" && inatRes.value?.results) {
    for (const t of inatRes.value.results) {
      if (t.iconic_taxon_name !== "Plantae") continue;
      const key = (t.name ?? "").toLowerCase();
      const existing = map.get(key);
      const entry: TaxonMatch = {
        scientificName: t.name,
        vernacularName: t.preferred_common_name ?? existing?.vernacularName ?? null,
        rank: t.rank ?? existing?.rank,
        gbifKey: existing?.gbifKey,
        inatId: t.id,
        kingdom: "Plantae",
        family: existing?.family,
        thumbnail: t.default_photo?.square_url ?? existing?.thumbnail ?? null,
      };
      map.set(key, entry);
    }
  }

  return Array.from(map.values()).slice(0, 12);
}

export async function resolveTaxon(name: string): Promise<TaxonMatch | null> {
  const q = name.trim();
  if (!q) return null;
  const [gbif, inat] = await Promise.allSettled([
    fetch(`https://api.gbif.org/v1/species/match?name=${encodeURIComponent(q)}&kingdom=Plantae&strict=false`).then((r) => r.json()),
    fetch(`https://api.inaturalist.org/v1/taxa?q=${encodeURIComponent(q)}&iconic_taxa=Plantae&per_page=1&locale=fi`).then((r) => r.json()),
  ]);

  let match: TaxonMatch | null = null;
  if (gbif.status === "fulfilled" && gbif.value?.usageKey) {
    match = {
      scientificName: gbif.value.canonicalName ?? gbif.value.scientificName ?? q,
      gbifKey: gbif.value.usageKey,
      rank: gbif.value.rank,
      kingdom: gbif.value.kingdom,
      family: gbif.value.family,
    };
  }
  if (inat.status === "fulfilled" && inat.value?.results?.[0]) {
    const t = inat.value.results[0];
    match = {
      scientificName: match?.scientificName ?? t.name,
      vernacularName: t.preferred_common_name ?? null,
      rank: match?.rank ?? t.rank,
      gbifKey: match?.gbifKey,
      inatId: t.id,
      kingdom: match?.kingdom ?? "Plantae",
      family: match?.family,
      thumbnail: t.default_photo?.medium_url ?? null,
    };
  }
  return match;
}

// ---------- OBSERVATIONS ----------

async function fetchGbif(taxonKey: number, signal?: AbortSignal): Promise<UnifiedObservation[]> {
  const pageSize = 300;
  const maxRecords = 10000;
  const all: UnifiedObservation[] = [];
  let offset = 0;
  while (offset < maxRecords) {
    const url = `https://api.gbif.org/v1/occurrence/search?taxonKey=${taxonKey}&country=${GBIF_FI}&hasCoordinate=true&hasGeospatialIssue=false&limit=${pageSize}&offset=${offset}`;
    const r = await fetch(url, { signal });
    if (!r.ok) break;
    const j = await r.json();
    const results: any[] = j.results ?? [];
    if (!results.length) break;
    for (const o of results) {
      if (typeof o.decimalLatitude !== "number" || typeof o.decimalLongitude !== "number") continue;
      all.push({
        id: `gbif-${o.key}`,
        source: "gbif",
        sourceUrl: `https://www.gbif.org/occurrence/${o.key}`,
        lat: o.decimalLatitude,
        lng: o.decimalLongitude,
        observedAt: o.eventDate ?? o.dateIdentified ?? null,
        recordedBy: o.recordedBy ?? o.identifiedBy ?? o.publishingOrgKey ?? null,
        scientificName: o.species ?? o.scientificName ?? "",
        vernacularName: o.vernacularName ?? null,
        image: o.media?.[0]?.identifier ?? null,
        images: (o.media ?? []).map((m: any) => m.identifier).filter(Boolean),
        locality: o.locality ?? o.stateProvince ?? null,
        basisOfRecord: o.basisOfRecord ?? null,
        isWild: o.establishmentMeans ? !/INTRODUCED|CULTIVATED|MANAGED/i.test(o.establishmentMeans) : null,
        identificationConfidence: null,
        taxonKey: o.taxonKey,
      });
    }
    if (j.endOfRecords || results.length < pageSize) break;
    offset += pageSize;
  }
  return all;
}

async function fetchINaturalist(taxonId: number, signal?: AbortSignal): Promise<UnifiedObservation[]> {
  const pageSize = 200;
  const maxRecords = 10000;
  const all: UnifiedObservation[] = [];
  let idAbove = 0;
  while (all.length < maxRecords) {
    const url = `https://api.inaturalist.org/v1/observations?taxon_id=${taxonId}&place_id=${FI_PLACE_ID}&geo=true&per_page=${pageSize}&order=asc&order_by=id&id_above=${idAbove}`;
    const r = await fetch(url, { signal });
    if (!r.ok) break;
    const j = await r.json();
    const results: any[] = j.results ?? [];
    if (!results.length) break;
    let lastId = idAbove;
    for (const o of results) {
      lastId = o.id ?? lastId;
      if (!o.geojson?.coordinates) continue;
      const [lng, lat] = o.geojson.coordinates;
      all.push({
        id: `inat-${o.id}`,
        source: "inaturalist",
        sourceUrl: `https://www.inaturalist.org/observations/${o.id}`,
        lat,
        lng,
        observedAt: o.observed_on ?? o.time_observed_at ?? null,
        recordedBy: o.user?.name ?? o.user?.login ?? null,
        scientificName: o.taxon?.name ?? "",
        vernacularName: o.taxon?.preferred_common_name ?? null,
        image: o.photos?.[0]?.url?.replace("square", "medium") ?? null,
        images: (o.photos ?? []).map((p: any) => p.url?.replace("square", "large")).filter(Boolean),
        locality: o.place_guess ?? null,
        basisOfRecord: "HumanObservation",
        isWild: o.captive === true ? false : true,
        identificationConfidence:
          o.quality_grade === "research" ? "research" : o.quality_grade === "casual" ? "casual" : "needs_id",
      });
    }
    if (lastId === idAbove || results.length < pageSize) break;
    idAbove = lastId;
  }
  return all;
}

export async function fetchObservations(taxon: TaxonMatch, signal?: AbortSignal): Promise<UnifiedObservation[]> {
  const tasks: Promise<UnifiedObservation[]>[] = [];
  if (taxon.gbifKey) tasks.push(fetchGbif(taxon.gbifKey, signal).catch(() => []));
  if (taxon.inatId) tasks.push(fetchINaturalist(taxon.inatId, signal).catch(() => []));
  const results = (await Promise.all(tasks)).flat();
  return dedupe(results);
}

// Dedupe by rounded coords + date + source-different
function dedupe(obs: UnifiedObservation[]): UnifiedObservation[] {
  const seen = new Map<string, UnifiedObservation>();
  for (const o of obs) {
    const k = `${o.lat.toFixed(4)}|${o.lng.toFixed(4)}|${o.observedAt ?? ""}`;
    const existing = seen.get(k);
    if (!existing) seen.set(k, o);
    else if (!existing.image && o.image) seen.set(k, o);
  }
  return Array.from(seen.values());
}
