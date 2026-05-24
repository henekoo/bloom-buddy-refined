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
import { PROJECT_TYPES, type ProjectTypeValue } from "@/lib/project-types";
import { MapView } from "@/components/MapView";
import { toast } from "sonner";
import { Loader2, MapPin } from "lucide-react";

export const Route = createFileRoute("/_app/projects/new")({
  component: NewProject,
});

function NewProject() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "", description: "", project_type: "house_yard" as ProjectTypeValue,
    location_name: "", area_sqm: "" as string,
    latitude: null as number | null, longitude: null as number | null,
    notes: "", cover_image_url: "",
  });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    try {
      const { data, error } = await supabase.from("projects").insert({
        user_id: user.id,
        name: form.name,
        description: form.description || null,
        project_type: form.project_type,
        location_name: form.location_name || null,
        latitude: form.latitude, longitude: form.longitude,
        area_sqm: form.area_sqm ? Number(form.area_sqm) : null,
        notes: form.notes || null,
        cover_image_url: form.cover_image_url || null,
      }).select().single();
      if (error) throw error;
      toast.success("Projekti luotu!");
      nav({ to: "/projects/$id", params: { id: data.id } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Virhe");
    } finally { setSaving(false); }
  };

  return (
    <div>
      <PageHeader title="Uusi projekti" subtitle="Esim. Talon piha, mökki, metsäpalsta" />
      <form onSubmit={submit} className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <section className="rounded-2xl border border-border bg-card p-6 space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2"><Label>Nimi *</Label><Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Vehkamäen metsäpalsta" /></div>
              <div>
                <Label>Tyyppi</Label>
                <Select value={form.project_type} onValueChange={(v) => setForm({ ...form, project_type: v as ProjectTypeValue })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PROJECT_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.emoji} {t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Pinta-ala (m²)</Label><Input type="number" value={form.area_sqm} onChange={(e) => setForm({ ...form, area_sqm: e.target.value })} /></div>
              <div className="sm:col-span-2"><Label>Paikan nimi</Label><Input value={form.location_name} onChange={(e) => setForm({ ...form, location_name: e.target.value })} /></div>
              <div className="sm:col-span-2"><Label>Kansikuvan URL</Label><Input value={form.cover_image_url} onChange={(e) => setForm({ ...form, cover_image_url: e.target.value })} placeholder="https://..." /></div>
              <div className="sm:col-span-2"><Label>Kuvaus</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} /></div>
              <div className="sm:col-span-2"><Label>Muistiinpanot</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} /></div>
            </div>
          </section>
        </div>
        <div className="space-y-6">
          <section className="rounded-2xl border border-border bg-card p-6 space-y-3">
            <h3 className="font-semibold">Sijainti</h3>
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="Lat" value={form.latitude ?? ""} onChange={(e) => setForm({ ...form, latitude: e.target.value ? Number(e.target.value) : null })} />
              <Input placeholder="Lng" value={form.longitude ?? ""} onChange={(e) => setForm({ ...form, longitude: e.target.value ? Number(e.target.value) : null })} />
            </div>
            <Button type="button" variant="outline" className="w-full" onClick={() => {
              navigator.geolocation?.getCurrentPosition((p) => setForm((f) => ({ ...f, latitude: p.coords.latitude, longitude: p.coords.longitude })));
            }}><MapPin className="h-4 w-4 mr-1" /> Käytä sijaintiani</Button>
            <MapView
              height="240px"
              points={form.latitude && form.longitude ? [{ id: "x", lat: form.latitude, lng: form.longitude, title: form.name || "Projekti" }] : []}
              onPick={(lat, lng) => setForm((f) => ({ ...f, latitude: lat, longitude: lng }))}
              center={form.latitude && form.longitude ? [form.latitude, form.longitude] : undefined}
            />
          </section>
          <Button type="submit" disabled={saving} className="w-full gradient-leaf text-primary-foreground border-0 shadow-leaf">
            {saving ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Tallennetaan…</> : "Luo projekti"}
          </Button>
        </div>
      </form>
    </div>
  );
}
