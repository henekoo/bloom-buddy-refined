import { createFileRoute, useNavigate, Link, Outlet, useLocation } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { MapView } from "@/components/MapView";
import { SpeciesInfoDialog } from "@/components/SpeciesInfoDialog";
import { Trash2, MapPin, Calendar, Tag, Pencil, Info, ChevronLeft, ChevronRight, X } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { useEffect, useState } from "react";


export const Route = createFileRoute("/_app/observations/$id")({
  component: ObservationDetailRoute,
});

function ObservationDetailRoute() {
  const location = useLocation();

  if (location.pathname.endsWith("/edit")) {
    return <Outlet />;
  }

  return <ObservationDetail />;
}

function ObservationDetail() {
  const { id } = Route.useParams();
  const nav = useNavigate();
  const qc = useQueryClient();
  const [lightbox, setLightbox] = useState<string | null>(null);

  const { data: obs, isLoading } = useQuery({
    queryKey: ["observation", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("observations").select("*").eq("id", id).single();
      if (error) throw error;
      return data;
    },
  });

  const remove = async () => {
    if (!confirm("Poistetaanko havainto?")) return;
    const { error } = await supabase.from("observations").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["observations"] });
    toast.success("Poistettu");
    nav({ to: "/observations" });
  };

  if (isLoading || !obs) {
    return <div className="h-96 rounded-2xl bg-muted animate-pulse" />;
  }

  return (
    <div>
      <PageHeader
        title={obs.name}
        subtitle={obs.scientific_name || obs.species || undefined}
        actions={
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link to="/observations/$id/edit" params={{ id: obs.id }}>
                <Pencil className="h-4 w-4 mr-1" /> Muokkaa
              </Link>
            </Button>
            <Button variant="outline" onClick={remove}><Trash2 className="h-4 w-4 mr-1" /> Poista</Button>
          </div>
        }
      />


      {obs.image_urls && obs.image_urls.length > 0 ? (
        <div className={`grid gap-3 mb-6 ${obs.image_urls.length === 1 ? "grid-cols-1" : "grid-cols-2 md:grid-cols-3"}`}>
          {obs.image_urls.map((url, i) => (
            <button key={i} onClick={() => setLightbox(url)} className="group rounded-2xl overflow-hidden focus:outline-none focus:ring-2 focus:ring-primary">
              <div className="aspect-[4/3] bg-muted overflow-hidden">
                <img src={url} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt="" loading="lazy" />
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="mb-6 rounded-2xl overflow-hidden border border-dashed border-border">
          <div className="aspect-[16/9] sm:aspect-[21/9] bg-muted/40 grid place-items-center text-muted-foreground text-sm">
            🌿 Ei kuvia tähän havaintoon
          </div>
        </div>
      )}


      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <section className="rounded-2xl border border-border bg-card p-6">
            <h3 className="font-semibold mb-4">Tiedot</h3>
            <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <Item label="Päivä" value={format(new Date(obs.observed_at), "d.M.yyyy")} icon={Calendar} />
              <Item label="Laji" value={obs.species} />
              <Item label="Tieteellinen nimi" value={obs.scientific_name} italic />
              <Item label="Kasvupaikka" value={obs.habitat} />
              <Item label="Kasvuvaihe" value={obs.growth_stage} />
              <Item label="Kunto" value={obs.condition} />
              <Item label="Määrä" value={obs.count} />
              <Item label="Koko" value={obs.estimated_size} />
              <Item label="Harvinaisuus" value={obs.rarity} />
              <Item label="Paikka" value={obs.location_name} icon={MapPin} />
            </dl>
            {obs.description && <div className="mt-4"><div className="text-xs text-muted-foreground mb-1">Kuvaus</div><p className="text-sm">{obs.description}</p></div>}
            {obs.notes && <div className="mt-4"><div className="text-xs text-muted-foreground mb-1">Muistiinpanot</div><p className="text-sm whitespace-pre-wrap">{obs.notes}</p></div>}
            {obs.tags && obs.tags.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {obs.tags.map((t) => <span key={t} className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-accent text-accent-foreground"><Tag className="h-3 w-3" />{t}</span>)}
              </div>
            )}
          </section>
        </div>
        <div className="space-y-6">
          {obs.latitude && obs.longitude ? (
            <MapView height="320px" points={[{ id: obs.id, lat: obs.latitude, lng: obs.longitude, title: obs.name, image: obs.image_urls?.[0] }]} />
          ) : (
            <div className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">Ei sijaintia</div>
          )}
        </div>
      </div>

      {lightbox && (
        <div onClick={() => setLightbox(null)} className="fixed inset-0 z-50 bg-black/90 grid place-items-center p-4 animate-fade-in">
          <img src={lightbox} className="max-w-full max-h-full object-contain rounded-lg" alt="" />
        </div>
      )}
    </div>
  );
}

function Item({ label, value, icon: Icon, italic }: { label: string; value: unknown; icon?: React.ComponentType<{ className?: string }>; italic?: boolean }) {
  if (!value && value !== 0) return null;
  return (
    <div>
      <dt className="text-xs text-muted-foreground flex items-center gap-1">{Icon && <Icon className="h-3 w-3" />}{label}</dt>
      <dd className={italic ? "italic" : ""}>{String(value)}</dd>
    </div>
  );
}
