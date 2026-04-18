import { cn } from "@/lib/utils";

const tones = {
  default: "bg-muted text-muted-foreground",
  success: "bg-emerald-50 text-emerald-700",
  warning: "bg-amber-50 text-amber-700",
  danger: "bg-rose-50 text-rose-700",
  info: "bg-cyan-50 text-cyan-700"
};

export function Badge({ tone = "default", className, ...props }: React.HTMLAttributes<HTMLSpanElement> & { tone?: keyof typeof tones }) {
  return <span className={cn("inline-flex rounded-md px-2.5 py-1 text-xs font-bold", tones[tone], className)} {...props} />;
}
