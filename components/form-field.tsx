export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="grid gap-2 text-sm font-bold text-foreground">{label}{children}</label>;
}

export const inputClass = "rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:border-primary";
