import type { ReactNode } from "react";

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8 animate-rise">
      <div className="min-w-0">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-semibold tracking-tight text-balance">
          {title}
        </h1>
        {subtitle && (
          <p className="text-sm md:text-base text-muted-foreground mt-1.5 leading-relaxed">
            {subtitle}
          </p>
        )}
      </div>
      {actions && <div className="flex flex-wrap gap-2 shrink-0">{actions}</div>}
    </div>
  );
}
