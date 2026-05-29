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
import { PROJECT_TYPES, type ProjectTypeValue } from "@/lib/project-types";
import { MapView } from "@/components/MapView";
import { CoverImagePicker } from "@/components/CoverImagePicker";
import { toast } from "sonner";
import { Loader2, MapPin } from "lucide-react";

export const Route = createFileRoute("/_app/projects/$id/edit")({
  component: EditProject,
});

function EditProject() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const nav = useNavigate();
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "", description: "", project_type: "house_yard" as ProjectTypeValue,
    location_name: "", area_sqm: "" as string,
    latitude: null as number | null, longitude: null as number | null,
    notes: "", cover_image_url: "",
  });

  const { data: project, isLoading } = useQuery({
    queryKey: ["project", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("projects").select("*").eq("id", id).single();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (!project) return;
    setForm({
      name: project.name ?? "",
      description: project.description ?? "",
      project_type: (project.project_type ?? "house_yard") as ProjectTypeValue,
      location_name: project.location_name ?? "",
      area_sqm: project.area_sqm != null ? String(project.area_sqm) : "",
      latitude: project.latitude,
      longitude: project.longitude,
      notes: project.notes ?? "",
      cover_image_url: project.cover_image_url ?? "",
    });
  }, [project]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { toast.error("Kirjaudu sisään"); return; }
    if (!form.name.trim()) { toast.error("Anna projektille nimi"); return; }
    setSaving(true);
    try {
      const validTypes = PROJECT_TYPES.map((t) => t.value) as string[];
      const safeType = (validTypes.includes(form.project_type as string)
        ? form.project_type
        : "other") as ProjectTypeValue;
      const payload = {
        name: form.name.trim(),
        description: form.description || null,
        project_type: safeType,
        location_name: form.location_name || null,
        latitude: form.latitude,
        longitude: form.longitude,
        area_sqm: form.area_sqm ? Number(form.area_sqm) : null,
        notes: form.notes || null,
        cover_image_url: form.cover_image_url?.trim() ? form.cover_image_url.trim() : null,
        updated_at: new Date().toISOString(),
      };
      const { error } = await supabase.from("projects").update(payload).eq("id", id).eq("user_id", user.id);
      if (error) {
        console.error("Project update error:", error, "payload:", payload);
        throw new Error(error.message || error.details || "Tallennus epäonnistui");
      }
      qc.invalidateQueries({ queryKey: ["project", id] });
      qc.invalidateQueries({ queryKey: ["projects"] });
      toast.success("Muutokset tallennettu");
      nav({ to: "/projects/$id", params: { id } });
    } catch (err) {
      console.error("Project save failed:", err);
      toast.error(err instanceof Error ? err.message : "Tallennus epäonnistui");
    } finally { setSaving(false); }
  };

  if (isLoading || !project) return <div className="h-96 rounded-2xl bg-muted animate-pulse" />;

  return (
    <div>
      <PageHeader
        title="Muokkaa projektia"
        subtitle={project.name}
        actions={<Button asChild variant="outline"><Link to="/projects/$id" params={{ id }}>Peruuta</Link></Button>}
      />
      <form onSubmit={submit} className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <section className="rounded-2xl border border-border bg-card p-6 space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2"><Label>Nimi *</Label><Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div>
                <Label>Tyyppi</Label>
                <Select value={form.project_type} onValueChange={(v) => { if (v) setForm({ ...form, project_type: v as ProjectTypeValue }); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PROJECT_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.emoji} {t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Pinta-ala (m²)</Label><Input type="number" value={form.area_sqm} onChange={(e) => setForm({ ...form, area_sqm: e.target.value })} /></div>
              <div className="sm:col-span-2"><Label>Paikan nimi</Label><Input value={form.location_name} onChange={(e) => setForm({ ...form, location_name: e.target.value })} /></div>
              <div className="sm:col-span-2">
                <CoverImagePicker value={form.cover_image_url} onChange={(v) => setForm({ ...form, cover_image_url: v })} />
              </div>
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
            {saving ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Tallennetaan…</> : "Tallenna muutokset"}
          </Button>
        </div>
      </form>
    </div>
  );
}
