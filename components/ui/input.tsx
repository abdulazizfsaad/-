import { cn } from "@/lib/utils";

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn("w-full rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:border-primary", props.className)} />;
}
