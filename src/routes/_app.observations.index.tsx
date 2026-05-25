import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { PlantImage } from "@/components/PlantImage";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Search, MapPin, Leaf, Pencil } from "lucide-react";
import { format } from "date-fns";


export const Route = createFileRoute("/_app/observations/")({
  component: Observations,
});

function Observations() {
  const [q, setQ] = useState("");
  const nav = useNavigate();
  const { data, isLoading } = useQuery({
    queryKey: ["observations"],
    queryFn: async () => {
      const { data, error } = await supabase.from("observations").select("*").order("observed_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const list = (data ?? []).filter((o) => {
    const s = q.toLowerCase();
    if (!s) return true;
    return [o.name, o.species, o.scientific_name, o.location_name, ...(o.tags ?? [])]
      .filter(Boolean).some((v) => String(v).toLowerCase().includes(s));
  });

  return (
    <div>
      <PageHeader
        title="Havainnot"
        subtitle={`${data?.length ?? 0} kasvihavaintoa`}
        actions={
          <Button asChild className="gradient-leaf text-primary-foreground border-0 shadow-leaf">
            <Link to="/observations/new"><Plus className="h-4 w-4 mr-1" /> Uusi</Link>
          </Button>
        }
      />

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Hae lajilla, tieteellisellä nimellä, paikalla, tagilla…" className="pl-10" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <div key={i} className="h-64 rounded-2xl bg-muted animate-pulse" />)}
        </div>
      ) : list.length === 0 ? (
        <div className="text-center py-20 rounded-2xl border border-dashed border-border">
          <Leaf className="h-10 w-10 mx-auto text-muted-foreground" />
          <p className="mt-3 text-muted-foreground">Ei havaintoja{q ? " hakuun" : ""}.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {list.map((o) => (
            <Link
              key={o.id}
              to="/observations/$id"
              params={{ id: o.id }}
              className="card-hover card-surface relative overflow-hidden group block focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <PlantImage
                src={o.image_urls?.[0]}
                alt={o.name}
                aspect="aspect-[4/3]"
                rounded="rounded-none"
                badge={o.image_urls && o.image_urls.length > 1
                  ? <span className="px-2 py-0.5 rounded-full bg-black/60 text-white text-xs">+{o.image_urls.length - 1}</span>
                  : null}
              />

              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  nav({ to: "/observations/$id/edit", params: { id: o.id } });
                }}
                aria-label="Muokkaa havaintoa"
                className="absolute top-3 right-3 z-10 h-10 w-10 rounded-full bg-background/95 backdrop-blur-md shadow-elegant border border-border grid place-items-center md:opacity-0 md:group-hover:opacity-100 md:focus:opacity-100 transition-all hover:scale-110"
              >
                <Pencil className="h-4 w-4" />
              </button>

              <div className="p-4">
                <div className="font-semibold truncate">{o.name}</div>
                <div className="text-xs text-muted-foreground italic truncate">{o.scientific_name || o.species || "—"}</div>
                <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                  <span className="tabular-nums">{format(new Date(o.observed_at), "d.M.yyyy")}</span>
                  {o.location_name && <span className="flex items-center gap-1 truncate max-w-[50%]"><MapPin className="h-3 w-3" />{o.location_name}</span>}
                </div>
                {o.tags && o.tags.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {o.tags.slice(0, 3).map((t) => (
                      <span key={t} className="text-[10px] px-2 py-0.5 rounded-full bg-accent text-accent-foreground">{t}</span>
                    ))}
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
