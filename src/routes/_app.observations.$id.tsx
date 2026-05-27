import { createFileRoute, useNavigate, Link, Outlet, useLocation } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const [speciesOpen, setSpeciesOpen] = useState(false);

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

  const hasImages = obs.image_urls && obs.image_urls.length > 0;
  const rarityColor: Record<string, string> = {
    common: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
    uncommon: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
    rare: "bg-orange-500/15 text-orange-700 dark:text-orange-300",
    very_rare: "bg-rose-500/15 text-rose-700 dark:text-rose-300",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-2">
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link to="/observations"><ChevronLeft className="h-4 w-4 mr-1" /> Havainnot</Link>
        </Button>
        <div className="flex flex-wrap gap-2 justify-end">
          {(obs.scientific_name || obs.species) && (
            <Button variant="outline" size="sm" onClick={() => setSpeciesOpen(true)}>
              <Info className="h-4 w-4 mr-1" /> Lajin tiedot
            </Button>
          )}
          <Button asChild variant="outline" size="sm">
            <Link to="/observations/$id/edit" params={{ id: obs.id }}>
              <Pencil className="h-4 w-4 mr-1" /> Muokkaa
            </Link>
          </Button>
          <Button variant="outline" size="sm" onClick={remove} className="text-destructive hover:text-destructive">
            <Trash2 className="h-4 w-4 mr-1" /> Poista
          </Button>
        </div>
      </div>

      {/* Hero */}
      <section className="relative rounded-3xl overflow-hidden border border-border bg-gradient-to-br from-primary/5 via-card to-card shadow-leaf">
        {hasImages ? (
          <button
            onClick={() => setLightboxIdx(0)}
            className="block w-full bg-muted/40 focus:outline-none"
            aria-label="Avaa kuva"
          >
            <img
              src={obs.image_urls![0]}
              alt={obs.name}
              loading="lazy"
              className="w-full max-h-[60vh] object-contain transition-transform duration-500 hover:scale-[1.01]"
            />
          </button>
        ) : (
          <div className="aspect-[21/9] grid place-items-center text-5xl">🌿</div>
        )}
        <div className="p-5 sm:p-7 border-t border-border bg-card/80 backdrop-blur">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{obs.name}</h1>
              {(obs.scientific_name || obs.species) && (
                <p className="mt-1 italic text-muted-foreground">{obs.scientific_name || obs.species}</p>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-muted text-muted-foreground">
                <Calendar className="h-3.5 w-3.5" />
                {format(new Date(obs.observed_at), "d.M.yyyy")}
              </span>
              {obs.location_name && (
                <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-muted text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5" />
                  {obs.location_name}
                </span>
              )}
              {obs.rarity && (
                <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium ${rarityColor[obs.rarity] ?? "bg-muted text-muted-foreground"}`}>
                  {obs.rarity}
                </span>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Additional images */}
      {hasImages && obs.image_urls!.length > 1 && (
        <div className="grid gap-3 grid-cols-3 sm:grid-cols-4 md:grid-cols-6">
          {obs.image_urls!.slice(1).map((url, i) => (
            <button
              key={i + 1}
              onClick={() => setLightboxIdx(i + 1)}
              className="group rounded-xl overflow-hidden border border-border bg-muted focus:outline-none focus:ring-2 focus:ring-primary aspect-square"
            >
              <img src={url} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" alt="" loading="lazy" />
            </button>
          ))}
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <section className="rounded-2xl border border-border bg-card p-6">
            <h3 className="font-semibold mb-4 text-lg">Tiedot</h3>
            <dl className="grid sm:grid-cols-2 gap-x-8 gap-y-4 text-sm">
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
            {obs.description && (
              <div className="mt-6 pt-5 border-t border-border">
                <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">Kuvaus</div>
                <p className="text-sm leading-relaxed">{obs.description}</p>
              </div>
            )}
            {obs.notes && (
              <div className="mt-5 pt-5 border-t border-border">
                <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">Muistiinpanot</div>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{obs.notes}</p>
              </div>
            )}
            {obs.tags && obs.tags.length > 0 && (
              <div className="mt-5 pt-5 border-t border-border flex flex-wrap gap-2">
                {obs.tags.map((t) => (
                  <span key={t} className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-accent text-accent-foreground">
                    <Tag className="h-3 w-3" />{t}
                  </span>
                ))}
              </div>
            )}
          </section>
        </div>
        <div className="space-y-6">
          <section className="rounded-2xl border border-border bg-card overflow-hidden">
            <div className="px-5 py-3 border-b border-border flex items-center gap-2 text-sm font-medium">
              <MapPin className="h-4 w-4 text-primary" /> Sijainti
            </div>
            {obs.latitude && obs.longitude ? (
              <MapView height="280px" points={[{ id: obs.id, lat: obs.latitude, lng: obs.longitude, title: obs.name, image: obs.image_urls?.[0] }]} />
            ) : (
              <div className="p-6 text-center text-sm text-muted-foreground">Ei sijaintia</div>
            )}
            {obs.latitude && obs.longitude && (
              <div className="px-5 py-3 text-xs text-muted-foreground font-mono">
                {obs.latitude.toFixed(5)}, {obs.longitude.toFixed(5)}
              </div>
            )}
          </section>
        </div>
      </div>

      {lightboxIdx !== null && obs.image_urls && obs.image_urls[lightboxIdx] && (
        <Lightbox
          images={obs.image_urls}
          index={lightboxIdx}
          onIndex={setLightboxIdx}
          onClose={() => setLightboxIdx(null)}
        />
      )}

      {(obs.scientific_name || obs.species) && (
        <SpeciesInfoDialog
          open={speciesOpen}
          onOpenChange={setSpeciesOpen}
          scientificName={obs.scientific_name || obs.species || ""}
          commonNameFi={obs.species}
        />
      )}
    </div>
  );
}

function Lightbox({ images, index, onIndex, onClose }: { images: string[]; index: number; onIndex: (i: number | null) => void; onClose: () => void }) {
  const [scale, setScale] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    setScale(1); setPos({ x: 0, y: 0 });
  }, [index]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight" && index < images.length - 1) onIndex(index + 1);
      else if (e.key === "ArrowLeft" && index > 0) onIndex(index - 1);
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [index, images.length, onIndex, onClose]);

  return (
    <div className="fixed inset-0 z-[9999] bg-black/95 flex items-center justify-center animate-fade-in select-none">
      <button onClick={onClose} aria-label="Sulje" className="absolute top-4 right-4 z-10 h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 text-white grid place-items-center">
        <X className="h-5 w-5" />
      </button>
      {images.length > 1 && (
        <div className="absolute top-4 left-4 z-10 px-3 py-1.5 rounded-full bg-white/10 text-white text-sm">{index + 1} / {images.length}</div>
      )}
      {index > 0 && (
        <button onClick={() => onIndex(index - 1)} aria-label="Edellinen" className="absolute left-2 sm:left-4 z-10 h-12 w-12 rounded-full bg-white/10 hover:bg-white/20 text-white grid place-items-center">
          <ChevronLeft className="h-6 w-6" />
        </button>
      )}
      {index < images.length - 1 && (
        <button onClick={() => onIndex(index + 1)} aria-label="Seuraava" className="absolute right-2 sm:right-4 z-10 h-12 w-12 rounded-full bg-white/10 hover:bg-white/20 text-white grid place-items-center">
          <ChevronRight className="h-6 w-6" />
        </button>
      )}
      <div
        className="w-full h-full flex items-center justify-center overflow-hidden"
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        onWheel={(e) => { e.preventDefault(); setScale((s) => Math.max(1, Math.min(5, s + (e.deltaY < 0 ? 0.2 : -0.2)))); }}
        onMouseDown={(e) => { if (scale > 1) setDragging({ x: e.clientX - pos.x, y: e.clientY - pos.y }); }}
        onMouseMove={(e) => { if (dragging) setPos({ x: e.clientX - dragging.x, y: e.clientY - dragging.y }); }}
        onMouseUp={() => setDragging(null)}
        onMouseLeave={() => setDragging(null)}
        onDoubleClick={() => { setScale((s) => (s > 1 ? 1 : 2)); setPos({ x: 0, y: 0 }); }}
      >
        <img
          src={images[index]}
          className="max-w-[95vw] max-h-[90vh] object-contain transition-transform duration-150"
          style={{ transform: `translate(${pos.x}px, ${pos.y}px) scale(${scale})`, cursor: scale > 1 ? (dragging ? "grabbing" : "grab") : "zoom-in" }}
          alt=""
          draggable={false}
        />
      </div>
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full bg-white/10 text-white text-xs">
        Vieritä = zoom · 2× klik = vaihda · Esc = sulje
      </div>
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
