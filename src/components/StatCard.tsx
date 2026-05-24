import { type LucideIcon } from "lucide-react";

export function StatCard({ label, value, icon: Icon, hint }: { label: string; value: string | number; icon: LucideIcon; hint?: string }) {
  return (
    <div className="card-hover card-surface relative overflow-hidden p-5 md:p-6">
      <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full gradient-leaf opacity-[0.08] blur-xl" />
      <div className="flex items-center gap-4">
        <div className="h-11 w-11 rounded-xl gradient-leaf grid place-items-center shadow-leaf shrink-0">
          <Icon className="h-5 w-5 text-primary-foreground" />
        </div>
        <div className="min-w-0">
          <div className="text-2xl md:text-3xl font-semibold tracking-tight tabular-nums">{value}</div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground mt-0.5">{label}</div>
        </div>
      </div>
      {hint && <div className="mt-4 text-xs text-muted-foreground leading-relaxed">{hint}</div>}
    </div>
  );
}
