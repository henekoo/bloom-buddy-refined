import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Plus, FolderTree, MapPin } from "lucide-react";
import { projectTypeMeta } from "@/lib/project-types";

export const Route = createFileRoute("/_app/projects/")({
  component: Projects,
});

function Projects() {
  const { data, isLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const { data, error } = await supabase.from("projects").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  return (
    <div>
      <PageHeader
        title="Projektit"
        subtitle="Pihat, mökit, metsät, arboretumit ja muut kokonaisuudet"
        actions={
          <Link to="/projects/new">
            <Button className="gradient-leaf text-primary-foreground border-0 shadow-leaf"><Plus className="h-4 w-4 mr-1" /> Uusi projekti</Button>
          </Link>
        }
      />

      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <div key={i} className="h-56 rounded-2xl bg-muted animate-pulse" />)}
        </div>
      ) : (data?.length ?? 0) === 0 ? (
        <div className="text-center py-20 rounded-2xl border border-dashed border-border">
          <FolderTree className="h-10 w-10 mx-auto text-muted-foreground" />
          <p className="mt-3 text-muted-foreground">Ei projekteja vielä.</p>
          <Link to="/projects/new" className="inline-block mt-4">
            <Button className="gradient-leaf text-primary-foreground border-0"><Plus className="h-4 w-4 mr-1" /> Luo ensimmäinen</Button>
          </Link>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {data!.map((p) => {
            const meta = projectTypeMeta(p.project_type);
            return (
              <Link key={p.id} to="/projects/$id" params={{ id: p.id }}
                className="card-hover rounded-2xl border border-border bg-card overflow-hidden block">
                <div className="aspect-[16/9] relative bg-muted">
                  {p.cover_image_url
                    ? <img src={p.cover_image_url} className="w-full h-full object-cover" alt="" />
                    : <div className="w-full h-full gradient-leaf grid place-items-center text-5xl opacity-90">{meta.emoji}</div>}
                  <div className="absolute top-3 left-3 px-2 py-1 rounded-full glass text-xs font-medium">{meta.emoji} {meta.label}</div>
                </div>
                <div className="p-5">
                  <div className="font-semibold">{p.name}</div>
                  {p.description && <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{p.description}</p>}
                  {p.location_name && <div className="mt-3 flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="h-3 w-3" />{p.location_name}</div>}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
