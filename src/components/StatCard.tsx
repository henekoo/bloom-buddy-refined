import { type LucideIcon } from "lucide-react";

export function StatCard({ label, value, icon: Icon, hint }: { label: string; value: string | number; icon: LucideIcon; hint?: string }) {
  return (
    <div className="card-hover relative overflow-hidden rounded-2xl border border-border bg-card p-5">
      <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full gradient-leaf opacity-10" />
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl gradient-leaf grid place-items-center shadow-leaf">
          <Icon className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <div className="text-2xl font-semibold tracking-tight">{value}</div>
          <div className="text-xs text-muted-foreground">{label}</div>
        </div>
      </div>
      {hint && <div className="mt-3 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}
