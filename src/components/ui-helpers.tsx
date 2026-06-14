import { cn } from "@/lib/utils";

export function KPICard({
  label, value, hint, accent, className,
}: { label: string; value: React.ReactNode; hint?: string; accent?: boolean; className?: string }) {
  return (
    <div className={cn(
      "rounded-2xl border border-border p-4 md:p-5",
      accent ? "bg-zinc-950 text-white border-zinc-800" : "bg-card",
      className,
    )}>
      <p className={cn("text-[11px] uppercase tracking-wider", accent ? "text-orange-400" : "text-muted-foreground")}>{label}</p>
      <p className="mt-2 font-display text-2xl md:text-3xl font-bold leading-none">{value}</p>
      {hint && <p className={cn("mt-1.5 text-xs", accent ? "text-zinc-400" : "text-muted-foreground")}>{hint}</p>}
    </div>
  );
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 mb-6">
      <div className="min-w-0">
        <h1 className="font-display text-2xl md:text-3xl font-bold tracking-tight truncate">{title}</h1>
        {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
