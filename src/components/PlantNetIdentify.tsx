import { useState } from "react";
import { Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type Suggestion = {
  scientificName: string;
  commonName?: string;
  score: number;
};

const MAX_IDENTIFY_EDGE = 1920;

function isHeic(file: File) {
  return /image\/(heic|heif)/i.test(file.type) || /\.(heic|heif)$/i.test(file.name);
}

async function convertHeic(file: File): Promise<Blob> {
  const { default: heic2any } = await import("heic2any");
  const converted = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.9 });
  return Array.isArray(converted) ? converted[0] : converted;
}

async function drawAsJpeg(blob: Blob): Promise<Blob> {
  const url = URL.createObjectURL(blob);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error("decode_failed"));
      i.src = url;
    });
    const scale = Math.min(1, MAX_IDENTIFY_EDGE / Math.max(img.width, img.height));
    const w = Math.round(img.width * scale);
    const h = Math.round(img.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("canvas_unavailable");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);
    const blob: Blob = await new Promise((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("encode_failed"))), "image/jpeg", 0.88),
    );
    return blob;
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function toPlantNetImage(file: File): Promise<File> {
  const source = isHeic(file) ? await convertHeic(file) : file;
  const jpeg = await drawAsJpeg(source);
  const safeName = file.name.replace(/\.[^.]+$/, "") || "plantnet-image";
  return new File([jpeg], `${safeName}.jpg`, { type: "image/jpeg" });
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
  const [errorText, setErrorText] = useState<string | null>(null);

  const identify = async () => {
    if (!file) {
      toast.error("Lisää ensin kuva");
      return;
    }
    setLoading(true);
    setFailed(false);
    setResults(null);
    setErrorText(null);
    try {
      const jpeg = await toPlantNetImage(file).catch((error) => {
        console.error("PlantNet image conversion failed", error);
        return null;
      });
      if (!jpeg) {
        toast.error("Kuvaa ei voitu lukea — kokeile JPG- tai PNG-kuvaa.");
        setErrorText("Kuvaa ei voitu lukea — kokeile JPG- tai PNG-kuvaa.");
        return;
      }
      const fd = new FormData();
      fd.append("images", jpeg, jpeg.name);
      fd.append("organs", "auto");
      const res = await fetch(
        "https://my-api.plantnet.org/v2/identify/all?api-key=2b10zkMSHaTsFO4U2DeBcETOe&lang=fi&nb-results=5&no-reject=true",
        { method: "POST", body: fd },
      );
      const data = await res.json().catch(() => null);
      if (!res.ok || !data) {
        console.error("PlantNet error", res.status, data);
        const message = data?.message ? `PlantNet: ${data.message}` : `PlantNet virhe (${res.status})`;
        toast.error(message);
        setErrorText(message);
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
      setErrorText("Tunnistuspalveluun ei saatu yhteyttä — yritä hetken päästä uudelleen.");
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
      {errorText && <p className="text-xs text-destructive">{errorText}</p>}
    </div>
  );
}
