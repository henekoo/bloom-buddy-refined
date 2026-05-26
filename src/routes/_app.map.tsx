import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { MapView } from "@/components/MapView";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { LocationSearch, inBbox, type LocationPick } from "@/components/LocationSearch";
import { Search, X } from "lucide-react";

export const Route = createFileRoute("/_app/map")({
  component: MapPage,
});

function MapPage() {
  const [q, setQ] = useState("");
  const [rarity, setRarity] = useState<string>("all");
  const [withImages, setWithImages] = useState<string>("all");
  const [place, setPlace] = useState<LocationPick>(null);

  const { data } = useQuery({
    queryKey: ["map-obs"],
    queryFn: async () =>
      (await supabase
        .from("observations")
        .select("id,name,species,scientific_name,latitude,longitude,image_urls,rarity,location_name,tags,observed_at")
        .not("latitude", "is", null)).data ?? [],
  });

  const filtered = useMemo(() => {
    const s = q.toLowerCase().trim();
    return (data ?? []).filter((o) => {
      if (!o.latitude || !o.longitude) return false;
      if (rarity !== "all" && o.rarity !== rarity) return false;
      if (withImages === "yes" && !(o.image_urls && o.image_urls.length > 0)) return false;
      if (withImages === "no" && o.image_urls && o.image_urls.length > 0) return false;
      if (place && !inBbox(o.latitude, o.longitude, place.bbox)) return false;
      if (!s) return true;
      return [o.name, o.species, o.scientific_name, o.location_name, ...(o.tags ?? [])]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(s));
    });
  }, [data, q, rarity, withImages, place]);


  const points = filtered.map((o) => ({
    id: o.id, lat: o.latitude!, lng: o.longitude!,
    title: o.name, subtitle: o.species ?? undefined, image: o.image_urls?.[0],
    link: `/observations/${o.id}`,
  }));

  const reset = () => { setQ(""); setRarity("all"); setWithImages("all"); setPlace(null); };
  const hasFilters = q || rarity !== "all" || withImages !== "all" || place;

  const mapCenter: [number, number] | undefined = place
    ? [(place.bbox[0] + place.bbox[1]) / 2, (place.bbox[2] + place.bbox[3]) / 2]
    : undefined;

  return (
    <div>
      <PageHeader
        title="Kartta"
        subtitle={`${points.length} / ${data?.length ?? 0} havaintoa kartalla${place ? ` · ${place.label}` : ""}`}
      />

      <div className="mb-4 grid gap-2 md:grid-cols-2 lg:grid-cols-[1fr_1fr_auto_auto_auto]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Hae nimellä, lajilla, tagilla…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="pl-10"
          />
        </div>
        <LocationSearch value={place} onChange={setPlace} />
        <Select value={rarity} onValueChange={setRarity}>
          <SelectTrigger className="lg:w-44"><SelectValue placeholder="Harvinaisuus" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Kaikki harvinaisuudet</SelectItem>
            <SelectItem value="common">Yleinen</SelectItem>
            <SelectItem value="uncommon">Harvinaisempi</SelectItem>
            <SelectItem value="rare">Harvinainen</SelectItem>
            <SelectItem value="endangered">Uhanalainen</SelectItem>
          </SelectContent>
        </Select>
        <Select value={withImages} onValueChange={setWithImages}>
          <SelectTrigger className="lg:w-40"><SelectValue placeholder="Kuvat" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Kaikki</SelectItem>
            <SelectItem value="yes">Vain kuvalliset</SelectItem>
            <SelectItem value="no">Vain ilman kuvaa</SelectItem>
          </SelectContent>
        </Select>
        {hasFilters && (
          <Button variant="outline" onClick={reset}>
            <X className="h-4 w-4 mr-1" /> Tyhjennä
          </Button>
        )}
      </div>

      <MapView points={points} height="72vh" center={mapCenter} />
    </div>

    </div>
  );
}
