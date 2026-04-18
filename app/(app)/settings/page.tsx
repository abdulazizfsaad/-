import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardTitle } from "@/components/ui/card";
import { requireAuth } from "@/lib/auth";
import { getSettings } from "@/lib/data";
import { UserRole } from "@prisma/client";

export default async function SettingsPage() {
  const session = await requireAuth([UserRole.SUPER_ADMIN, UserRole.COMPANY_ADMIN]);
  const { tenant, settings } = await getSettings(session);
  return (
    <>
      <PageHeader title="إعدادات الشركة" description="إعدادات الهوية، الاشتراك، حدود الباقة، والسياسات التشغيلية للتحصيل." />
      <section className="grid gap-6 xl:grid-cols-[.9fr_1.1fr]">
        <Card>
          <CardTitle>بيانات الشركة</CardTitle>
          <div className="mt-4 grid gap-3 text-sm">
            <p><span className="font-bold text-muted-foreground">الاسم: </span>{tenant?.name}</p>
            <p><span className="font-bold text-muted-foreground">البريد: </span>{tenant?.email}</p>
            <p><span className="font-bold text-muted-foreground">السجل التجاري: </span>{tenant?.commercialRegistrationNumber}</p>
            <p><span className="font-bold text-muted-foreground">الرقم الضريبي: </span>{tenant?.vatNumber}</p>
            <p><span className="font-bold text-muted-foreground">المدينة: </span>{tenant?.city}</p>
            <p><span className="font-bold text-muted-foreground">الباقة: </span><Badge tone="success">{tenant?.subscriptionPlan?.name ?? "-"}</Badge></p>
          </div>
        </Card>
        <Card>
          <CardTitle>إعدادات التحصيل</CardTitle>
          <div className="mt-4 grid gap-3">
            {settings.map((setting) => <div key={setting.id} className="rounded-md border border-border p-3"><p className="font-extrabold">{setting.key}</p><pre className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{JSON.stringify(setting.value, null, 2)}</pre></div>)}
          </div>
        </Card>
      </section>
    </>
  );
}
