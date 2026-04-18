import { AppShell } from "@/components/app-shell";
import { requireAuth } from "@/lib/auth";

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAuth();
  return <AppShell user={session.user}>{children}</AppShell>;
}
