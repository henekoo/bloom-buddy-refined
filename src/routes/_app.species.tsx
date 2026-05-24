import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Sprout } from "lucide-react";

export const Route = createFileRoute("/_app/species")({
  component: Species,
});

function Species() {
  const { data } = useQuery({
    queryKey: ["species"],
    queryFn: async () => (await supabase.from("observations").select("species,scientific_name,image_urls")).data ?? [],
  });

  const grouped = new Map<string, { count: number; scientific?: string; image?: string }>();
  (data ?? []).forEach((o) => {
    const key = (o.species || o.scientific_name || "Tuntematon").trim();
    const entry = grouped.get(key) ?? { count: 0 };
    entry.count++;
    if (!entry.scientific && o.scientific_name) entry.scientific = o.scientific_name;
    if (!entry.image && o.image_urls?.[0]) entry.image = o.image_urls[0];
    grouped.set(key, entry);
  });
  const list = [...grouped.entries()].sort((a, b) => b[1].count - a[1].count);

  return (
    <div>
      <PageHeader title="Lajirekisteri" subtitle={`${list.length} eri lajia havainnoissa`} />
      {list.length === 0 ? (
        <div className="text-center py-20 rounded-2xl border border-dashed border-border">
          <Sprout className="h-10 w-10 mx-auto text-muted-foreground" />
          <p className="mt-3 text-muted-foreground">Lisää havaintoja nähdäksesi lajisi tässä.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {list.map(([name, info]) => (
            <div key={name} className="card-hover rounded-2xl border border-border bg-card overflow-hidden">
              <div className="aspect-square bg-muted">
                {info.image ? <img src={info.image} className="w-full h-full object-cover" alt={name} /> : <div className="w-full h-full grid place-items-center text-4xl">🌿</div>}
              </div>
              <div className="p-4">
                <div className="font-semibold truncate">{name}</div>
                {info.scientific && <div className="text-xs italic text-muted-foreground truncate">{info.scientific}</div>}
                <div className="mt-2 text-xs text-primary">{info.count} havaintoa</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
