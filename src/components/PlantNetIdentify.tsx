import { useState } from "react";
import { Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type Suggestion = {
  scientificName: string;
  commonName?: string;
  score: number;
};

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
      const fd = new FormData();
      fd.append("images", file);
      fd.append("organs", "leaf");
      const res = await fetch(
        "https://my-api.plantnet.org/v2/identify/all?api-key=2b10zkMSHaTsFO4U2DeBcETOe&lang=fi",
        { method: "POST", body: fd },
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const top: Suggestion[] = (data.results ?? []).slice(0, 3).map((r: any) => {
        const fiName =
          (r.species?.commonNames ?? []).find((n: string) => /[äöå]/i.test(n)) ??
          r.species?.commonNames?.[0];
        return {
          scientificName: r.species?.scientificNameWithoutAuthor ?? r.species?.scientificName ?? "",
          commonName: fiName,
          score: r.score ?? 0,
        };
      }).filter((s: Suggestion) => s.scientificName);
      if (!top.length) {
        setFailed(true);
      } else {
        setResults(top);
      }
    } catch {
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
