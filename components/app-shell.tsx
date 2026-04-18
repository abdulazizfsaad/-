import Link from "next/link";
import { Bell, BarChart3, Building2, CreditCard, FileText, HandCoins, LayoutDashboard, MessageSquare, Plug, Receipt, Settings, ShieldCheck, Users, WalletCards } from "lucide-react";
import { LogoutButton } from "@/components/logout-button";
import { roleLabels } from "@/lib/auth";

const nav = [
  { href: "/dashboard", label: "لوحة التحكم", icon: LayoutDashboard },
  { href: "/customers", label: "العملاء", icon: Building2 },
  { href: "/invoices", label: "الفواتير", icon: FileText },
  { href: "/cases", label: "قضايا التحصيل", icon: HandCoins },
  { href: "/payments", label: "المدفوعات", icon: CreditCard },
  { href: "/promises", label: "وعود السداد", icon: WalletCards },
  { href: "/sms/messages", label: "رسائل SMS", icon: MessageSquare },
  { href: "/whatsapp/messages", label: "رسائل واتساب", icon: MessageSquare },
  { href: "/reports", label: "التقارير", icon: BarChart3 },
  { href: "/billing", label: "الاشتراك والفوترة", icon: Receipt },
  { href: "/users", label: "المستخدمون والصلاحيات", icon: Users },
  { href: "/settings", label: "الإعدادات", icon: Settings },
  { href: "/settings/integrations/sms", label: "تكاملات SMS", icon: Plug },
  { href: "/settings/integrations/whatsapp", label: "تكاملات واتساب", icon: Plug }
];

export function AppShell({ children, user }: { children: React.ReactNode; user: { name: string; role: keyof typeof roleLabels; tenantName?: string | null } }) {
  return (
    <div className="min-h-screen bg-background text-foreground lg:flex">
      <aside className="border-l border-border bg-white lg:fixed lg:inset-y-0 lg:right-0 lg:w-72">
        <div className="flex h-20 items-center gap-3 border-b border-border px-6">
          <div className="grid size-11 place-items-center rounded-lg bg-primary text-lg font-extrabold text-white">ث</div>
          <div>
            <p className="text-base font-extrabold">ثمار للتحصيل</p>
            <p className="text-xs text-muted-foreground">منصة الذمم المدينة</p>
          </div>
        </div>
        <nav className="grid max-h-[calc(100vh-5rem)] gap-1 overflow-y-auto p-4">
          {nav.map((item) => (
            <Link key={item.href} href={item.href} className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-bold text-muted-foreground hover:bg-muted hover:text-foreground">
              <item.icon className="size-4" />
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <div className="flex min-h-screen flex-1 flex-col lg:mr-72">
        <header className="sticky top-0 z-10 flex min-h-20 flex-wrap items-center justify-between gap-3 border-b border-border bg-background/90 px-6 backdrop-blur">
          <div>
            <p className="text-xs font-bold text-muted-foreground">الشركة الحالية</p>
            <h1 className="text-xl font-extrabold">{user.tenantName ?? "كل الشركات"}</h1>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/admin/tenants" className="hidden rounded-md border border-border bg-white px-3 py-2 text-sm font-bold text-muted-foreground md:block">مبدل الشركات</Link>
            <button className="grid size-10 place-items-center rounded-md border border-border bg-white"><Bell className="size-4" /></button>
            <div className="hidden items-center gap-2 rounded-md border border-border bg-white px-3 py-2 md:flex">
              <ShieldCheck className="size-4 text-primary" />
              <span className="text-sm font-bold">{roleLabels[user.role]}</span>
            </div>
            <div className="text-left">
              <p className="text-sm font-extrabold">{user.name}</p>
              <p className="text-xs text-muted-foreground">جلسة آمنة</p>
            </div>
            <LogoutButton />
          </div>
        </header>
        <main className="flex-1 px-4 py-6 md:px-8">{children}</main>
      </div>
    </div>
  );
}
