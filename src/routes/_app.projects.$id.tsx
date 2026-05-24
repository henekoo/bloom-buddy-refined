import { createFileRoute, Link, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { MapView } from "@/components/MapView";
import { projectTypeMeta } from "@/lib/project-types";
import { Trash2, MapPin, Leaf, Pencil } from "lucide-react";
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
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Havainnot ({obsList.length})</h3>
              <Link to="/observations/new" className="text-sm text-primary hover:underline">+ Lisää</Link>
            </div>
            {obsList.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-6"><Leaf className="h-6 w-6 mx-auto mb-2" />Ei havaintoja projektissa</div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-3">
                {obsList.map((o) => (
                  <Link key={o.id} to="/observations/$id" params={{ id: o.id }} className="flex gap-3 p-3 rounded-xl hover:bg-muted/60 transition">
                    <div className="h-14 w-14 rounded-lg overflow-hidden bg-muted shrink-0">
                      {o.image_urls?.[0] ? <img src={o.image_urls[0]} className="w-full h-full object-cover" alt="" /> : <div className="w-full h-full grid place-items-center text-xl">🌿</div>}
                    </div>
                    <div className="min-w-0">
                      <div className="font-medium truncate">{o.name}</div>
                      <div className="text-xs text-muted-foreground italic truncate">{o.scientific_name || o.species || "—"}</div>
                    </div>
                  </Link>
                ))}
              </div>
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
