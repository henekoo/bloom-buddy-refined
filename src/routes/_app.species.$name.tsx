import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ChevronLeft, MapPin, Calendar, Info, Sprout, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapView } from "@/components/MapView";
import { format } from "date-fns";
import { useState } from "react";
import { SpeciesInfoDialog } from "@/components/SpeciesInfoDialog";

export const Route = createFileRoute("/_app/species/$name")({
  component: SpeciesDetail,
});

function SpeciesDetail() {
  const { name } = Route.useParams();
  const [infoOpen, setInfoOpen] = useState(false);

  const { data: obs, isLoading } = useQuery({
    queryKey: ["species-obs", name],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("observations")
        .select("*")
        .or(`species.eq.${name},scientific_name.eq.${name}`)
        .order("observed_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  if (isLoading) return <div className="h-96 rounded-2xl bg-muted animate-pulse" />;

  const scientific = obs?.find((o) => o.scientific_name)?.scientific_name ?? null;
  const cover = obs?.find((o) => o.image_urls && o.image_urls.length > 0)?.image_urls?.[0];
  const points = (obs ?? [])
    .filter((o) => o.latitude && o.longitude)
    .map((o) => ({ id: o.id, lat: o.latitude!, lng: o.longitude!, title: o.name, image: o.image_urls?.[0] }));
  const totalImages = (obs ?? []).reduce((acc, o) => acc + (o.image_urls?.length ?? 0), 0);
  const locations = new Set((obs ?? []).map((o) => o.location_name).filter(Boolean));

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link to="/species"><ChevronLeft className="h-4 w-4 mr-1" /> Lajirekisteri</Link>
      </Button>

      {/* Hero */}
      <section className="relative rounded-3xl overflow-hidden border border-border bg-gradient-to-br from-primary/10 via-card to-card shadow-leaf">
        <div className="grid md:grid-cols-[1fr_1.2fr]">
          <div className="aspect-square md:aspect-auto bg-muted">
            {cover ? (
              <img src={cover} alt={name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full grid place-items-center text-6xl">🌿</div>
            )}
          </div>
          <div className="p-6 sm:p-8 flex flex-col justify-center">
            <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Laji</div>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">{name}</h1>
            {scientific && scientific !== name && (
              <p className="mt-1 italic text-muted-foreground">{scientific}</p>
            )}
            <div className="mt-5 flex flex-wrap gap-2">
              <Badge variant="secondary"><Sprout className="h-3.5 w-3.5 mr-1" /> {obs?.length ?? 0} havaintoa</Badge>
              <Badge variant="secondary"><ImageIcon className="h-3.5 w-3.5 mr-1" /> {totalImages} kuvaa</Badge>
              <Badge variant="secondary"><MapPin className="h-3.5 w-3.5 mr-1" /> {locations.size} paikkaa</Badge>
            </div>
            {(scientific || name) && (
              <Button onClick={() => setInfoOpen(true)} variant="outline" size="sm" className="mt-5 self-start">
                <Info className="h-4 w-4 mr-1" /> Lajin tiedot
              </Button>
            )}
          </div>
        </div>
      </section>

      {/* Map */}
      {points.length > 0 && (
        <section className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="px-5 py-3 border-b border-border flex items-center gap-2 text-sm font-medium">
            <MapPin className="h-4 w-4 text-primary" /> Esiintymät kartalla
          </div>
          <MapView height="360px" points={points} />
        </section>
      )}

      {/* Observations */}
      <section>
        <h2 className="text-lg font-semibold mb-3">Havainnot</h2>
        {obs && obs.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {obs.map((o) => (
              <Link
                key={o.id}
                to="/observations/$id"
                params={{ id: o.id }}
                className="card-hover rounded-2xl border border-border bg-card overflow-hidden block"
              >
                <div className="aspect-square bg-muted">
                  {o.image_urls?.[0] ? (
                    <img src={o.image_urls[0]} alt={o.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full grid place-items-center text-3xl">🌿</div>
                  )}
                </div>
                <div className="p-3">
                  <div className="font-medium text-sm truncate">{o.name}</div>
                  <div className="mt-1 text-xs text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3" />{format(new Date(o.observed_at), "d.M.yyyy")}
                  </div>
                  {o.location_name && (
                    <div className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                      <MapPin className="h-3 w-3" />{o.location_name}
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 rounded-2xl border border-dashed border-border text-muted-foreground">
            Ei havaintoja
          </div>
        )}
      </section>

      <SpeciesInfoDialog
        open={infoOpen}
        onOpenChange={setInfoOpen}
        scientificName={scientific || name}
        commonNameFi={name}
      />
    </div>
  );
}
