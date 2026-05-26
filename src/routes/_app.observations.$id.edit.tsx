import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { PageHeader } from "@/components/PageHeader";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ImageUpload } from "@/components/ImageUpload";
import { MapView } from "@/components/MapView";
import { TaxonSearch } from "@/components/TaxonSearch";
import { uploadObservationImages } from "@/lib/storage";
import { toast } from "sonner";
import { Loader2, MapPin, X, ArrowLeft, ArrowRight, Star } from "lucide-react";

export const Route = createFileRoute("/_app/observations/$id/edit")({
  component: EditObservation,
});

function EditObservation() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const nav = useNavigate();
  const qc = useQueryClient();
  const [files, setFiles] = useState<File[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ done: number; total: number } | null>(null);

  const [form, setForm] = useState({
    name: "", species: "", scientific_name: "", observed_at: new Date().toISOString().slice(0, 10),
    description: "", notes: "", habitat: "", count: "" as string, growth_stage: "", condition: "",
    estimated_size: "", rarity: "", location_name: "", tags: "",
    latitude: null as number | null, longitude: null as number | null,
    project_id: "" as string,
  });

  const { data: obs, isLoading } = useQuery({
    queryKey: ["observation", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("observations").select("*").eq("id", id).single();
      if (error) throw error;
      return data;
    },
  });

  const { data: projects } = useQuery({
    queryKey: ["projects-mini"],
    queryFn: async () => (await supabase.from("projects").select("id,name").order("name")).data ?? [],
  });

  const { data: projectLink } = useQuery({
    queryKey: ["observation-project", id],
    queryFn: async () => {
      const { data } = await supabase.from("project_observations").select("project_id").eq("observation_id", id).maybeSingle();
      return data?.project_id ?? "";
    },
  });

  useEffect(() => {
    if (!obs) return;
    setForm({
      name: obs.name ?? "",
      species: obs.species ?? "",
      scientific_name: obs.scientific_name ?? "",
      observed_at: obs.observed_at ?? new Date().toISOString().slice(0, 10),
      description: obs.description ?? "",
      notes: obs.notes ?? "",
      habitat: obs.habitat ?? "",
      count: obs.count != null ? String(obs.count) : "",
      growth_stage: obs.growth_stage ?? "",
      condition: obs.condition ?? "",
      estimated_size: obs.estimated_size ?? "",
      rarity: obs.rarity ?? "",
      location_name: obs.location_name ?? "",
      tags: (obs.tags ?? []).join(", "),
      latitude: obs.latitude,
      longitude: obs.longitude,
      project_id: projectLink ?? "",
    });
    setExistingImages(obs.image_urls ?? []);
  }, [obs, projectLink]);

  const useMyLocation = () => {
    if (!navigator.geolocation) return toast.error("Sijainti ei käytettävissä");
    navigator.geolocation.getCurrentPosition(
      (p) => setForm((f) => ({ ...f, latitude: p.coords.latitude, longitude: p.coords.longitude })),
      () => toast.error("Sijaintia ei saatu"),
    );
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!form.name.trim()) { toast.error("Anna havainnolle nimi"); return; }
    setSaving(true);
    try {
      let newUrls: string[] = [];
      if (files.length) {
        setUploading(true);
        setUploadProgress({ done: 0, total: files.length });
        try {
          newUrls = await uploadObservationImages(user.id, files, (done, total) => setUploadProgress({ done, total }));
        } finally { setUploading(false); }
      }
      const tags = form.tags.split(",").map((t) => t.trim()).filter(Boolean);
      const { error } = await supabase.from("observations").update({
        name: form.name,
        species: form.species || null,
        scientific_name: form.scientific_name || null,
        observed_at: form.observed_at,
        description: form.description || null,
        notes: form.notes || null,
        habitat: form.habitat || null,
        count: form.count ? Number(form.count) : null,
        growth_stage: form.growth_stage || null,
        condition: form.condition || null,
        estimated_size: form.estimated_size || null,
        rarity: form.rarity || null,
        location_name: form.location_name || null,
        latitude: form.latitude,
        longitude: form.longitude,
        tags,
        image_urls: [...existingImages, ...newUrls],
      }).eq("id", id);
      if (error) throw error;

      // Update project link: remove old, add new (if changed)
      if ((projectLink ?? "") !== form.project_id) {
        await supabase.from("project_observations").delete().eq("observation_id", id).eq("user_id", user.id);
        if (form.project_id) {
          await supabase.from("project_observations").insert({
            project_id: form.project_id, observation_id: id, user_id: user.id,
          });
        }
      }

      qc.invalidateQueries({ queryKey: ["observation", id] });
      qc.invalidateQueries({ queryKey: ["observations"] });
      qc.invalidateQueries({ queryKey: ["observation-project", id] });
      toast.success("Muutokset tallennettu");
      nav({ to: "/observations/$id", params: { id } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Tallennus epäonnistui");
    } finally {
      setSaving(false);
    }
  };

  if (isLoading || !obs) return <div className="h-96 rounded-2xl bg-muted animate-pulse" />;

  return (
    <div>
      <PageHeader
        title="Muokkaa havaintoa"
        subtitle={obs.name}
        actions={<Button asChild variant="outline"><Link to="/observations/$id" params={{ id }}>Peruuta</Link></Button>}
      />
      <form onSubmit={submit} className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <section className="rounded-2xl border border-border bg-card p-6 space-y-4">
            <h3 className="font-semibold">Perustiedot</h3>
            <div className="grid sm:grid-cols-2 gap-4">
              <div><Label>Nimi *</Label><Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div><Label>Päivä *</Label><Input type="date" required value={form.observed_at} onChange={(e) => setForm({ ...form, observed_at: e.target.value })} /></div>
              <div><Label>Laji</Label><Input value={form.species} onChange={(e) => setForm({ ...form, species: e.target.value })} /></div>
              <div><Label>Tieteellinen nimi</Label><Input value={form.scientific_name} onChange={(e) => setForm({ ...form, scientific_name: e.target.value })} /></div>
              <div><Label>Kasvupaikka</Label><Input value={form.habitat} onChange={(e) => setForm({ ...form, habitat: e.target.value })} /></div>
              <div><Label>Kasvuvaihe</Label><Input value={form.growth_stage} onChange={(e) => setForm({ ...form, growth_stage: e.target.value })} /></div>
              <div>
                <Label>Kunto</Label>
                <Select value={form.condition || undefined} onValueChange={(v) => setForm({ ...form, condition: v })}>
                  <SelectTrigger><SelectValue placeholder="Valitse (valinnainen)" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="excellent">Erinomainen</SelectItem>
                    <SelectItem value="good">Hyvä</SelectItem>
                    <SelectItem value="fair">Tyydyttävä</SelectItem>
                    <SelectItem value="poor">Heikko</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Harvinaisuus</Label>
                <Select value={form.rarity || undefined} onValueChange={(v) => setForm({ ...form, rarity: v })}>
                  <SelectTrigger><SelectValue placeholder="Valitse (valinnainen)" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="common">Yleinen</SelectItem>
                    <SelectItem value="uncommon">Harvinaisempi</SelectItem>
                    <SelectItem value="rare">Harvinainen</SelectItem>
                    <SelectItem value="endangered">Uhanalainen</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Määrä</Label><Input type="number" min={1} value={form.count} onChange={(e) => setForm({ ...form, count: e.target.value })} /></div>
              <div><Label>Koko / korkeus</Label><Input value={form.estimated_size} onChange={(e) => setForm({ ...form, estimated_size: e.target.value })} /></div>
            </div>
            <div><Label>Kuvaus</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} /></div>
            <div><Label>Muistiinpanot</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} /></div>
            <div><Label>Tagit (pilkulla)</Label><Input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} /></div>
          </section>

          <section className="rounded-2xl border border-border bg-card p-6 space-y-4">
            <h3 className="font-semibold">Kuvat</h3>
            {existingImages.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs text-muted-foreground">Nykyiset kuvat — ensimmäinen näkyy kansikuvana</div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {existingImages.map((url, i) => (
                    <div key={url} className="relative aspect-square rounded-xl overflow-hidden bg-muted ring-1 ring-border">
                      <img src={url} className="w-full h-full object-cover" alt="" loading="lazy" />
                      {i === 0 && (
                        <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-md bg-primary text-primary-foreground text-[10px] font-medium flex items-center gap-1">
                          <Star className="h-2.5 w-2.5 fill-current" /> Kansi
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => setExistingImages((prev) => prev.filter((u) => u !== url))}
                        aria-label="Poista kuva"
                        className="absolute top-1.5 right-1.5 h-7 w-7 rounded-full bg-black/70 text-white grid place-items-center hover:bg-black/90 transition"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                      <div className="absolute bottom-1.5 inset-x-1.5 flex gap-1 justify-between">
                        <button
                          type="button"
                          disabled={i === 0}
                          onClick={() => setExistingImages((prev) => {
                            const arr = [...prev];
                            [arr[i - 1], arr[i]] = [arr[i], arr[i - 1]];
                            return arr;
                          })}
                          className="h-7 w-7 rounded-full bg-background/95 text-foreground grid place-items-center shadow-sm hover:bg-background disabled:opacity-30 disabled:cursor-not-allowed transition"
                          aria-label="Siirrä vasemmalle"
                        >
                          <ArrowLeft className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={i === existingImages.length - 1}
                          onClick={() => setExistingImages((prev) => {
                            const arr = [...prev];
                            [arr[i], arr[i + 1]] = [arr[i + 1], arr[i]];
                            return arr;
                          })}
                          className="h-7 w-7 rounded-full bg-background/95 text-foreground grid place-items-center shadow-sm hover:bg-background disabled:opacity-30 disabled:cursor-not-allowed transition"
                          aria-label="Siirrä oikealle"
                        >
                          <ArrowRight className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <ImageUpload files={files} onChange={setFiles} uploading={uploading} disabled={saving && !uploading} />
          </section>
        </div>

        <div className="space-y-6">
          <section className="rounded-2xl border border-border bg-card p-6 space-y-4">
            <h3 className="font-semibold">Sijainti</h3>
            <div><Label>Paikan nimi</Label><Input value={form.location_name} onChange={(e) => setForm({ ...form, location_name: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="Lat" value={form.latitude ?? ""} onChange={(e) => setForm({ ...form, latitude: e.target.value ? Number(e.target.value) : null })} />
              <Input placeholder="Lng" value={form.longitude ?? ""} onChange={(e) => setForm({ ...form, longitude: e.target.value ? Number(e.target.value) : null })} />
            </div>
            <Button type="button" variant="outline" className="w-full" onClick={useMyLocation}><MapPin className="h-4 w-4 mr-1" /> Käytä sijaintiani</Button>
            <MapView
              height="260px"
              points={form.latitude && form.longitude ? [{ id: "x", lat: form.latitude, lng: form.longitude, title: form.name || "Havainto" }] : []}
              onPick={(lat, lng) => setForm((f) => ({ ...f, latitude: lat, longitude: lng }))}
              center={form.latitude && form.longitude ? [form.latitude, form.longitude] : undefined}
            />
          </section>

          <section className="rounded-2xl border border-border bg-card p-6 space-y-4">
            <h3 className="font-semibold">Projekti</h3>
            <Select value={form.project_id || "none"} onValueChange={(v) => setForm({ ...form, project_id: v === "none" ? "" : v })}>
              <SelectTrigger><SelectValue placeholder="Valitse projekti (valinnainen)" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Ei projektia</SelectItem>
                {projects?.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </section>

          <Button type="submit" disabled={saving} className="w-full gradient-leaf text-primary-foreground border-0 shadow-leaf">
            {saving
              ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> {uploading ? `Ladataan kuvia ${uploadProgress?.done ?? 0}/${uploadProgress?.total ?? 0}…` : "Tallennetaan…"}</>
              : "Tallenna muutokset"}
          </Button>
        </div>
      </form>
    </div>
  );
}
