import { useState } from "react";
import { Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type Suggestion = {
  scientificName: string;
  commonName?: string;
  score: number;
};

const PLANTNET_ACCEPTED = ["image/jpeg", "image/jpg", "image/png"];

// Convert any browser-decodable image (HEIC on Safari, webp, gif…) to JPEG via canvas.
async function toJpegBlob(file: File): Promise<Blob> {
  if (PLANTNET_ACCEPTED.includes(file.type)) return file;
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error("decode_failed"));
      i.src = url;
    });
    const max = 1600;
    const scale = Math.min(1, max / Math.max(img.width, img.height));
    const w = Math.round(img.width * scale);
    const h = Math.round(img.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("canvas_unavailable");
    ctx.drawImage(img, 0, 0, w, h);
    const blob: Blob = await new Promise((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("encode_failed"))), "image/jpeg", 0.9),
    );
    return blob;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function PlantNetIdentify({
  file,
  onPick,
}: {
  file: File | null;
  onPick: (v: { species: string; scientific_name: string }) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Suggestion[] | null>(null);
  const [failed, setFailed] = useState(false);

  const identify = async () => {
    if (!file) {
      toast.error("Lisää ensin kuva");
      return;
    }
    setLoading(true);
    setFailed(false);
    setResults(null);
    try {
      const jpeg = await toJpegBlob(file).catch(() => null);
      if (!jpeg) {
        toast.error("Kuvaa ei voitu lukea — kokeile JPG- tai PNG-kuvaa.");
        setFailed(true);
        return;
      }
      const fd = new FormData();
      fd.append("images", jpeg, "image.jpg");
      // organs is optional; "auto" lets PlantNet detect the organ
      fd.append("organs", "auto");
      const res = await fetch(
        "https://my-api.plantnet.org/v2/identify/all?api-key=2b10zkMSHaTsFO4U2DeBcETOe&lang=fi&nb-results=5",
        { method: "POST", body: fd },
      );
      const data = await res.json().catch(() => null);
      if (!res.ok || !data) {
        console.error("PlantNet error", res.status, data);
        toast.error(data?.message ? `PlantNet: ${data.message}` : `PlantNet virhe (${res.status})`);
        setFailed(true);
        return;
      }
      const top: Suggestion[] = (data.results ?? [])
        .slice(0, 3)
        .map((r: any) => ({
          scientificName:
            r.species?.scientificNameWithoutAuthor ?? r.species?.scientificName ?? "",
          commonName: r.species?.commonNames?.[0],
          score: typeof r.score === "number" ? r.score : 0,
        }))
        .filter((s: Suggestion) => s.scientificName);
      if (!top.length) {
        setFailed(true);
      } else {
        setResults(top);
      }
    } catch (e) {
      console.error("PlantNet failed", e);
      setFailed(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={identify}
        disabled={loading || !file}
        className="w-full sm:w-auto"
      >
        {loading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Search className="h-4 w-4 mr-1" />}
        🔍 Tunnista laji (PlantNet)
      </Button>
      {results && results.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {results.map((r) => (
            <button
              key={r.scientificName}
              type="button"
              onClick={() =>
                onPick({
                  species: r.commonName ?? r.scientificName,
                  scientific_name: r.scientificName,
                })
              }
              className="rounded-full border border-border bg-card hover:bg-accent px-3 py-1.5 text-xs flex items-center gap-2 transition"
            >
              <span className="font-semibold italic">{r.scientificName}</span>
              {r.commonName && <span className="text-muted-foreground">· {r.commonName}</span>}
              <span className="text-primary font-medium">{Math.round(r.score * 100)}%</span>
            </button>
          ))}
        </div>
      )}
      {failed && (
        <p className="text-xs text-muted-foreground">Lajia ei tunnistettu — voit lisätä lajin itse.</p>
      )}
    </div>
  );
}
