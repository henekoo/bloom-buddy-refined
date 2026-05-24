import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { MapView } from "@/components/MapView";

export const Route = createFileRoute("/_app/map")({
  component: MapPage,
});

function MapPage() {
  const { data } = useQuery({
    queryKey: ["map-obs"],
    queryFn: async () => (await supabase.from("observations").select("id,name,species,latitude,longitude,image_urls").not("latitude", "is", null)).data ?? [],
  });

  const points = (data ?? []).filter((o) => o.latitude && o.longitude).map((o) => ({
    id: o.id, lat: o.latitude!, lng: o.longitude!,
    title: o.name, subtitle: o.species ?? undefined, image: o.image_urls?.[0],
    link: `/observations/${o.id}`,
  }));

  return (
    <div>
      <PageHeader title="Kartta" subtitle={`${points.length} havaintoa kartalla`} />
      <MapView points={points} height="78vh" />
    </div>
  );
}
