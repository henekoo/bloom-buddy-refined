import { useState } from "react";
import { cn } from "@/lib/utils";
import { Leaf } from "lucide-react";

type Props = {
  src?: string | null;
  alt?: string;
  className?: string;
  rounded?: string;
  /** Tailwind aspect class, e.g. "aspect-square", "aspect-[4/3]" */
  aspect?: string;
  /** When true, fills parent (no aspect wrapper) */
  fill?: boolean;
  badge?: React.ReactNode;
};

/**
 * Responsive image with graceful placeholder and rounded container.
 * Use everywhere observation imagery is shown for consistent UX.
 */
export function PlantImage({
  src,
  alt = "",
  className,
  rounded = "rounded-xl",
  aspect = "aspect-[4/3]",
  fill = false,
  badge,
}: Props) {
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);
  const showImg = src && !errored;

  const inner = (
    <>
      {showImg ? (
        <img
          src={src!}
          alt={alt}
          loading="lazy"
          decoding="async"
          onLoad={() => setLoaded(true)}
          onError={() => setErrored(true)}
          className={cn(
            "w-full h-full object-cover transition-all duration-700",
            loaded ? "opacity-100 blur-0 scale-100" : "opacity-0 blur-sm scale-105",
          )}
        />
      ) : (
        <Placeholder />
      )}
      {showImg && !loaded && <div className="absolute inset-0 animate-pulse bg-muted" />}
      {badge && <div className="absolute bottom-2 right-2">{badge}</div>}
    </>
  );

  if (fill) {
    return <div className={cn("relative overflow-hidden bg-muted", rounded, className)}>{inner}</div>;
  }
  return <div className={cn("relative overflow-hidden bg-muted", rounded, aspect, className)}>{inner}</div>;
}

function Placeholder() {
  return (
    <div className="absolute inset-0 grid place-items-center bg-gradient-to-br from-primary/5 via-muted to-primary/10">
      <div className="flex flex-col items-center text-muted-foreground/70">
        <div className="h-12 w-12 rounded-full bg-background/60 grid place-items-center shadow-sm">
          <Leaf className="h-6 w-6" />
        </div>
        <span className="mt-2 text-[10px] uppercase tracking-wider">Ei kuvaa</span>
      </div>
    </div>
  );
}
