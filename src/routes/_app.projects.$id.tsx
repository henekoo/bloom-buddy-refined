import { createFileRoute, Link, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MapView } from "@/components/MapView";
import { PlantImage } from "@/components/PlantImage";
import { projectTypeMeta } from "@/lib/project-types";
import { Trash2, MapPin, Leaf, Pencil, Search, Sprout, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/projects/$id")({
  component: ProjectDetailRoute,
});

function ProjectDetailRoute() {
  const location = useLocation();

  if (location.pathname.endsWith("/edit")) {
    return <Outlet />;
  }

  return <ProjectDetail />;
}

function ProjectDetail() {
  const { id } = Route.useParams();
  const nav = useNavigate();
  const qc = useQueryClient();
  const [filter, setFilter] = useState("");


  const { data: project, isLoading } = useQuery({
    queryKey: ["project", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("projects").select("*").eq("id", id).single();
      if (error) throw error;
      return data;
    },
  });

  const { data: observations } = useQuery({
    queryKey: ["project-obs", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_observations")
        .select("observation_id, observations(*)")
        .eq("project_id", id);
      if (error) throw error;
      return (data ?? []).map((r) => r.observations).filter(Boolean) as Array<Record<string, unknown>>;
    },
  });

  const remove = async () => {
    if (!confirm("Poistetaanko projekti?")) return;
    const { error } = await supabase.from("projects").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["projects"] });
    toast.success("Poistettu");
    nav({ to: "/projects" });
  };

  if (isLoading || !project) return <div className="h-96 rounded-2xl bg-muted animate-pulse" />;
  const meta = projectTypeMeta(project.project_type);
  const obsList = (observations ?? []) as Array<{ id: string; name: string; latitude: number | null; longitude: number | null; image_urls: string[] | null; species: string | null; scientific_name: string | null }>;
  const points = obsList.filter((o) => o.latitude && o.longitude).map((o) => ({
    id: o.id, lat: o.latitude!, lng: o.longitude!, title: o.name, subtitle: o.species ?? undefined, image: o.image_urls?.[0],
    link: `/observations/${o.id}`,
  }));

  return (
    <div>
      <PageHeader
        title={project.name}
        subtitle={`${meta.emoji} ${meta.label}${project.location_name ? ` · ${project.location_name}` : ""}`}
        actions={
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link to="/projects/$id/edit" params={{ id: project.id }}>
                <Pencil className="h-4 w-4 mr-1" /> Muokkaa
              </Link>
            </Button>
            <Button variant="outline" onClick={remove}><Trash2 className="h-4 w-4 mr-1" /> Poista</Button>
          </div>
        }
      />


      {project.cover_image_url && (
        <div className="aspect-[21/9] rounded-2xl overflow-hidden mb-6">
          <img src={project.cover_image_url} className="w-full h-full object-cover" alt="" />
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <section className="rounded-2xl border border-border bg-card p-6">
            <h3 className="font-semibold mb-3">Tiedot</h3>
            {project.description && <p className="text-sm">{project.description}</p>}
            {project.area_sqm && <div className="mt-3 text-sm text-muted-foreground">Pinta-ala: {project.area_sqm} m²</div>}
            {project.notes && <p className="text-sm whitespace-pre-wrap mt-3">{project.notes}</p>}
          </section>

          <section className="rounded-2xl border border-border bg-card p-6">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <h3 className="font-semibold">Havainnot</h3>
              <Link to="/observations/new" className="text-sm text-primary hover:underline">+ Lisää havainto</Link>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="rounded-xl bg-muted/40 p-3 text-center">
                <Leaf className="h-4 w-4 mx-auto text-primary mb-1" />
                <div className="text-lg font-semibold tabular-nums">{obsList.length}</div>
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Havaintoa</div>
              </div>
              <div className="rounded-xl bg-muted/40 p-3 text-center">
                <Sprout className="h-4 w-4 mx-auto text-primary mb-1" />
                <div className="text-lg font-semibold tabular-nums">{new Set(obsList.map((o) => o.scientific_name || o.species).filter(Boolean)).size}</div>
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Lajia</div>
              </div>
              <div className="rounded-xl bg-muted/40 p-3 text-center">
                <ImageIcon className="h-4 w-4 mx-auto text-primary mb-1" />
                <div className="text-lg font-semibold tabular-nums">{obsList.filter((o) => o.image_urls && o.image_urls.length > 0).length}</div>
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Kuvallista</div>
              </div>
            </div>

            {obsList.length > 0 && (
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Suodata nimellä tai lajilla…" className="pl-10" />
              </div>
            )}

            {obsList.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-8"><Leaf className="h-6 w-6 mx-auto mb-2" />Ei havaintoja projektissa</div>
            ) : (
              (() => {
                const f = filter.toLowerCase().trim();
                const shown = f ? obsList.filter((o) => [o.name, o.species, o.scientific_name].filter(Boolean).some((v) => String(v).toLowerCase().includes(f))) : obsList;
                if (shown.length === 0) return <div className="text-sm text-muted-foreground text-center py-6">Ei osumia</div>;
                return (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3">
                    {shown.map((o) => (
                      <Link key={o.id} to="/observations/$id" params={{ id: o.id }} className="group rounded-xl overflow-hidden border border-border bg-card hover:shadow-elegant transition">
                        <PlantImage src={o.image_urls?.[0] ?? undefined} alt={o.name} aspect="aspect-square" rounded="rounded-none" />
                        <div className="p-2">
                          <div className="text-sm font-medium truncate">{o.name}</div>
                          <div className="text-[11px] text-muted-foreground italic truncate">{o.scientific_name || o.species || "—"}</div>
                        </div>
                      </Link>
                    ))}
                  </div>
                );
              })()
            )}
          </section>

        </div>

        <div className="space-y-6">
          {project.latitude && project.longitude ? (
            <MapView height="320px" points={[{ id: "p", lat: project.latitude, lng: project.longitude, title: project.name }, ...points]} center={[project.latitude, project.longitude]} />
          ) : points.length > 0 ? (
            <MapView height="320px" points={points} />
          ) : (
            <div className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground flex items-center justify-center gap-2"><MapPin className="h-4 w-4" />Ei sijaintia</div>
          )}
        </div>
      </div>
    </div>
  );
}
