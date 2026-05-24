import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { StatCard } from "@/components/StatCard";
import { PageHeader } from "@/components/PageHeader";
import { Leaf, FolderTree, Sprout, MapPin, Plus, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

export const Route = createFileRoute("/_app/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  const { user } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const [obs, proj] = await Promise.all([
        supabase.from("observations").select("*").order("created_at", { ascending: false }).limit(100),
        supabase.from("projects").select("*").order("created_at", { ascending: false }),
      ]);
      if (obs.error) throw obs.error;
      if (proj.error) throw proj.error;
      return { observations: obs.data, projects: proj.data };
    },
  });

  const observations = data?.observations ?? [];
  const projects = data?.projects ?? [];
  const speciesSet = new Set(observations.map((o) => o.species || o.name).filter(Boolean));
  const withGps = observations.filter((o) => o.latitude && o.longitude);

  return (
    <div className="space-y-8">
      <PageHeader
        title={`Hei ${user?.user_metadata?.full_name || user?.email?.split("@")[0]} 🌿`}
        subtitle="Yhteenveto luontohavainnoistasi ja projekteistasi"
        actions={
          <Button asChild className="gradient-leaf text-primary-foreground border-0 shadow-leaf">
            <Link to="/observations/new">
              <Plus className="h-4 w-4 mr-1" /> Uusi havainto
            </Link>
          </Button>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Havaintoja" value={isLoading ? "…" : observations.length} icon={Leaf} />
        <StatCard label="Eri lajeja" value={isLoading ? "…" : speciesSet.size} icon={Sprout} />
        <StatCard label="Projekteja" value={isLoading ? "…" : projects.length} icon={FolderTree} />
        <StatCard label="GPS-merkattuja" value={isLoading ? "…" : withGps.length} icon={MapPin} />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <section className="lg:col-span-2 rounded-2xl border border-border bg-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-lg">Uusimmat havainnot</h2>
            <Link to="/observations" className="text-sm text-primary hover:underline">Katso kaikki →</Link>
          </div>
          {isLoading ? (
            <div className="space-y-2">{[...Array(4)].map((_, i) => <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />)}</div>
          ) : observations.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="space-y-2">
              {observations.slice(0, 6).map((o) => (
                <div key={o.id} className="group relative flex items-center gap-4 p-3 rounded-xl hover:bg-muted/60 transition-colors">
                  <Link to="/observations/$id" params={{ id: o.id }} className="absolute inset-0 rounded-xl" aria-label={o.name} />
                  <div className="h-14 w-14 rounded-xl overflow-hidden bg-muted shrink-0 relative">
                    {o.image_urls?.[0]
                      ? <img src={o.image_urls[0]} className="w-full h-full object-cover" alt="" loading="lazy" />
                      : <div className="w-full h-full grid place-items-center bg-gradient-to-br from-primary/10 to-muted text-xl">🌿</div>}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="font-medium truncate">{o.name}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {o.scientific_name || o.species || "—"} · {format(new Date(o.observed_at), "d.M.yyyy")}
                    </div>
                  </div>
                  {o.location_name && <div className="text-xs text-muted-foreground hidden sm:flex items-center gap-1"><MapPin className="h-3 w-3" />{o.location_name}</div>}
                  <Button asChild size="sm" variant="outline" className="relative z-10 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                    <Link to="/observations/$id/edit" params={{ id: o.id }} onClick={(e) => e.stopPropagation()}>
                      <Pencil className="h-3.5 w-3.5" /> Muokkaa
                    </Link>
                  </Button>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-border bg-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-lg">Projektit</h2>
            <Link to="/projects" className="text-sm text-primary hover:underline">Hallinnoi →</Link>
          </div>
          {projects.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              Ei projekteja vielä. <Link to="/projects/new" className="text-primary underline">Luo ensimmäinen</Link>.
            </div>
          ) : (
            <div className="space-y-2">
              {projects.slice(0, 6).map((p) => (
                <Link key={p.id} to="/projects/$id" params={{ id: p.id }}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/60 transition-colors">
                  <div className="h-10 w-10 rounded-lg gradient-leaf grid place-items-center text-lg">🌿</div>
                  <div className="min-w-0">
                    <div className="font-medium truncate">{p.name}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1"><Calendar className="h-3 w-3" />{format(new Date(p.created_at), "d.M.yyyy")}</div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-10">
      <div className="h-16 w-16 rounded-2xl gradient-leaf grid place-items-center mx-auto shadow-leaf">
        <Leaf className="h-7 w-7 text-primary-foreground" />
      </div>
      <h3 className="mt-4 font-semibold">Ei vielä havaintoja</h3>
      <p className="text-sm text-muted-foreground mt-1">Lisää ensimmäinen kasvihavainto kuvineen ja sijainteineen.</p>
      <Link to="/observations/new" className="inline-block mt-4">
        <Button className="gradient-leaf text-primary-foreground border-0"><Plus className="h-4 w-4 mr-1" /> Uusi havainto</Button>
      </Link>
    </div>
  );
}
