import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
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
import { PlantNetIdentify } from "@/components/PlantNetIdentify";
import { uploadObservationImages } from "@/lib/storage";
import { toast } from "sonner";
import { MapPin, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

export const Route = createFileRoute("/_app/observations/new")({
  component: NewObservation,
});

function NewObservation() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [files, setFiles] = useState<File[]>([]);
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

  const { data: projects } = useQuery({
    queryKey: ["projects-mini"],
    queryFn: async () => (await supabase.from("projects").select("id,name").order("name")).data ?? [],
  });

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
      let image_urls: string[] = [];
      if (files.length) {
        setUploading(true);
        setUploadProgress({ done: 0, total: files.length });
        try {
          image_urls = await uploadObservationImages(user.id, files, (done, total) => {
            setUploadProgress({ done, total });
          });
        } finally {
          setUploading(false);
        }
      }
      const tags = form.tags.split(",").map((t) => t.trim()).filter(Boolean);
      const { data, error } = await supabase.from("observations").insert({
        user_id: user.id,
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
        image_urls,
      }).select().single();
      if (error) throw error;
      if (form.project_id && data) {
        await supabase.from("project_observations").insert({
          project_id: form.project_id, observation_id: data.id, user_id: user.id,
        });
      }
      toast.success("Havainto tallennettu!");
      nav({ to: "/observations/$id", params: { id: data.id } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Tallennus epäonnistui");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader title="Uusi havainto" subtitle="Tallenna kasvi kuvineen ja sijainteineen" />
      <form onSubmit={submit} className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <section className="rounded-2xl border border-border bg-card p-6 space-y-4">
            <h3 className="font-semibold">Perustiedot</h3>
            <div className="grid sm:grid-cols-2 gap-4">
              <div><Label>Nimi *</Label><Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="esim. Mustikka pihalla" /></div>
              <div><Label>Päivä *</Label><Input type="date" required value={form.observed_at} onChange={(e) => setForm({ ...form, observed_at: e.target.value })} /></div>
              <TaxonSearch
                species={form.species}
                scientificName={form.scientific_name}
                onChange={(v) => setForm((f) => ({ ...f, species: v.species, scientific_name: v.scientific_name, name: f.name || v.species }))}
              />

              <div><Label>Kasvupaikka</Label><Input value={form.habitat} onChange={(e) => setForm({ ...form, habitat: e.target.value })} placeholder="Kangasmetsä" /></div>
              <div><Label>Kasvuvaihe</Label><Input value={form.growth_stage} onChange={(e) => setForm({ ...form, growth_stage: e.target.value })} placeholder="Kukinta" /></div>
              <div>
                <Label>Kunto</Label>
                <Select value={form.condition} onValueChange={(v) => setForm({ ...form, condition: v })}>
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
                <Select value={form.rarity} onValueChange={(v) => setForm({ ...form, rarity: v })}>
                  <SelectTrigger><SelectValue placeholder="Valitse (valinnainen)" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="common">Yleinen</SelectItem>
                    <SelectItem value="uncommon">Harvinaisempi</SelectItem>
                    <SelectItem value="rare">Harvinainen</SelectItem>
                    <SelectItem value="endangered">Uhanalainen</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Määrä</Label><Input type="number" min={1} value={form.count} onChange={(e) => setForm({ ...form, count: e.target.value })} placeholder="esim. 1" /></div>
              <div><Label>Koko / korkeus</Label><Input value={form.estimated_size} onChange={(e) => setForm({ ...form, estimated_size: e.target.value })} placeholder="~40 cm" /></div>
            </div>
            <div><Label>Kuvaus</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} /></div>
            <div><Label>Muistiinpanot (markdown)</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} /></div>
            <div><Label>Tagit (pilkulla)</Label><Input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="metsä, marja, syksy" /></div>
          </section>

          <section className="rounded-2xl border border-border bg-card p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Kuvat</h3>
              {uploadProgress && uploading && (
                <span className="text-xs text-muted-foreground">
                  Ladataan {uploadProgress.done}/{uploadProgress.total}…
                </span>
              )}
            </div>
            <ImageUpload files={files} onChange={setFiles} uploading={uploading} disabled={saving && !uploading} />
            <PlantNetIdentify
              file={files[0] ?? null}
              onPick={(v) => setForm((f) => ({ ...f, species: v.species, scientific_name: v.scientific_name, name: f.name || v.species }))}
            />
          </section>

        </div>

        <div className="space-y-6">
          <section className="rounded-2xl border border-border bg-card p-6 space-y-4">
            <h3 className="font-semibold">Sijainti</h3>
            <div><Label>Paikan nimi</Label><Input value={form.location_name} onChange={(e) => setForm({ ...form, location_name: e.target.value })} placeholder="Mökin piha" /></div>
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="Lat" value={form.latitude ?? ""} onChange={(e) => setForm({ ...form, latitude: e.target.value ? Number(e.target.value) : null })} />
              <Input placeholder="Lng" value={form.longitude ?? ""} onChange={(e) => setForm({ ...form, longitude: e.target.value ? Number(e.target.value) : null })} />
            </div>
            <Button type="button" variant="outline" className="w-full" onClick={useMyLocation}><MapPin className="h-4 w-4 mr-1" /> Käytä sijaintiani</Button>
            <p className="text-xs text-muted-foreground">Tai klikkaa karttaa valitaksesi paikan.</p>
            <MapView
              height="260px"
              points={form.latitude && form.longitude ? [{ id: "x", lat: form.latitude, lng: form.longitude, title: form.name || "Uusi havainto" }] : []}
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
              : "Tallenna havainto"}
          </Button>

        </div>
      </form>
    </div>
  );
}
