import { cn } from "@/lib/utils";

export function KpiCard({ title, value, description, tone }: { title: string; value: string; description?: string; tone?: "default" | "success" | "warning" | "danger" }) {
  const colors = {
    default: "bg-slate-50 text-slate-900",
    success: "bg-emerald-50 text-emerald-900",
    warning: "bg-amber-50 text-amber-900",
    danger: "bg-rose-50 text-rose-900"
  };
  return (
    <div className={cn("rounded-3xl border border-border p-5 shadow-soft", colors[tone ?? "default"])}>
      <p className="text-sm font-bold text-muted-foreground">{title}</p>
      <p className="mt-3 text-3xl font-extrabold">{value}</p>
      {description ? <p className="mt-2 text-sm text-muted-foreground">{description}</p> : null}
    </div>
  );
}
