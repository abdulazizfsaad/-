import { cn } from "@/lib/utils";

export function Button({ className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn("rounded-md bg-primary px-4 py-2 text-sm font-bold text-primary-foreground shadow-sm hover:brightness-95 disabled:opacity-60", className)}
      {...props}
    />
  );
}
