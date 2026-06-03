import { useEffect, useRef, useState } from "react";
import { Upload, X, ImageIcon, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const MAX_SIZE = 20 * 1024 * 1024; // 20 MB
const ACCEPTED = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif", "image/gif"];

type Preview = { file: File; url: string };

export function ImageUpload({
  files,
  onChange,
  disabled = false,
  uploading = false,
  max = 12,
}: {
  files: File[];
  onChange: (files: File[]) => void;
  disabled?: boolean;
  uploading?: boolean;
  max?: number;
}) {
  const [drag, setDrag] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [previews, setPreviews] = useState<Preview[]>([]);

  // Keep previews in sync with files; revoke old object URLs when removed.
  useEffect(() => {
    setPreviews((prev) => {
      const next: Preview[] = files.map((f) => {
        const existing = prev.find((p) => p.file === f);
        return existing ?? { file: f, url: URL.createObjectURL(f) };
      });
      // Revoke URLs no longer needed
      prev.forEach((p) => {
        if (!next.find((n) => n.file === p.file)) URL.revokeObjectURL(p.url);
      });
      return next;
    });
  }, [files]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      previews.forEach((p) => URL.revokeObjectURL(p.url));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const add = (list: FileList | null) => {
    if (!list || disabled || uploading) return;
    const incoming = Array.from(list);
    const accepted: File[] = [];
    const rejected: string[] = [];
    for (const f of incoming) {
      const okType = f.type ? ACCEPTED.includes(f.type) || f.type.startsWith("image/") : /\.(jpe?g|png|webp|heic|heif|gif)$/i.test(f.name);
      if (!okType) { rejected.push(`${f.name}: ei tuettu tiedostotyyppi`); continue; }
      if (f.size > MAX_SIZE) { rejected.push(`${f.name}: liian iso (max 20 MB)`); continue; }
      accepted.push(f);
    }
    if (rejected.length) toast.error(rejected.join("\n"));
    if (!accepted.length) return;
    const combined = [...files, ...accepted].slice(0, max);
    if (files.length + accepted.length > max) {
      toast.error(`Enintään ${max} kuvaa per havainto`);
    }
    onChange(combined);
  };

  const remove = (i: number) => {
    if (uploading) return;
    onChange(files.filter((_, j) => j !== i));
  };

  return (
    <div>
      <label
        onDragOver={(e) => { e.preventDefault(); if (!disabled && !uploading) setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); add(e.dataTransfer.files); }}
        className={cn(
          "block border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all",
          drag ? "border-primary bg-primary/10 scale-[1.01]" : "border-border hover:border-primary/50 hover:bg-muted/40",
          (disabled || uploading) && "opacity-60 cursor-not-allowed",
        )}
      >
        <div className="mx-auto h-11 w-11 rounded-full bg-primary/10 grid place-items-center mb-2">
          {uploading
            ? <Loader2 className="h-5 w-5 text-primary animate-spin" />
            : <Upload className="h-5 w-5 text-primary" />}
        </div>
        <div className="text-sm font-medium">
          {uploading ? "Ladataan kuvia…" : "Raahaa kuvat tai klikkaa valitaksesi"}
        </div>
        <div className="text-xs text-muted-foreground mt-1">
          JPG, PNG, WebP, HEIC · max 20 MB · enintään {max} kuvaa
        </div>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/*"
          className="hidden"
          disabled={disabled || uploading}
          onChange={(e) => { add(e.target.files); if (inputRef.current) inputRef.current.value = ""; }}
        />
      </label>

      {previews.length > 0 && (
        <div className="mt-4 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
          {previews.map((p, i) => (
            <div key={p.url} className="relative group aspect-square rounded-xl overflow-hidden bg-muted ring-1 ring-border">
              <img
                src={p.url}
                className="w-full h-full object-cover"
                alt={p.file.name}
                loading="lazy"
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
              />
              {uploading && (
                <div className="absolute inset-0 grid place-items-center bg-black/40">
                  <Loader2 className="h-5 w-5 text-white animate-spin" />
                </div>
              )}
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); remove(i); }}
                disabled={uploading}
                aria-label="Poista kuva"
                className="absolute top-1.5 right-1.5 h-7 w-7 rounded-full bg-black/70 text-white grid place-items-center opacity-0 group-hover:opacity-100 focus:opacity-100 transition disabled:opacity-50"
              >
                <X className="h-3.5 w-3.5" />
              </button>
              <div className="absolute bottom-0 inset-x-0 px-2 py-1 text-[10px] text-white bg-gradient-to-t from-black/70 to-transparent truncate">
                {(p.file.size / 1024 / 1024).toFixed(1)} MB
              </div>
            </div>
          ))}
          {previews.length === 0 && (
            <div className="col-span-full text-center text-xs text-muted-foreground py-6 flex flex-col items-center gap-2">
              <ImageIcon className="h-5 w-5" />
              Ei valittuja kuvia
            </div>
          )}
        </div>
      )}
    </div>
  );
}
