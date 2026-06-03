import { useRef, useState } from "react";
import { Upload, X, Loader2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { uploadProjectCover } from "@/lib/storage";
import { toast } from "sonner";

export function CoverImagePicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (url: string) => void;
}) {
  const { user } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (file: File) => {
    if (!user) { toast.error("Kirjaudu sisään ladataksesi kuvan"); return; }
    setUploading(true);
    try {
      const url = await uploadProjectCover(user.id, file);
      onChange(url);
      toast.success("Kansikuva ladattu");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Lataus epäonnistui");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-3">
      <Label>Kansikuva</Label>
      {value ? (
        <div className="relative rounded-xl overflow-hidden border border-border aspect-[21/9] bg-muted group">
          <img src={value} alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="px-3 py-1.5 rounded-lg bg-background/95 text-foreground text-sm font-medium hover:bg-background flex items-center gap-1"
            >
              {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
              Vaihda kuva
            </button>
            <button
              type="button"
              onClick={() => onChange("")}
              className="h-9 w-9 rounded-full bg-black/70 text-white grid place-items-center hover:bg-black/90"
              aria-label="Poista kansikuva"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="w-full border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-primary/50 hover:bg-muted/40 transition flex flex-col items-center gap-2 disabled:opacity-60"
        >
          {uploading ? <Loader2 className="h-7 w-7 text-primary animate-spin" /> : <Upload className="h-7 w-7 text-primary" />}
          <div className="text-sm font-medium">{uploading ? "Ladataan…" : "Lataa kansikuva laitteelta"}</div>
          <div className="text-xs text-muted-foreground">JPG, PNG, WebP · max 20 MB</div>
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
        }}
      />
    </div>
  );
}
