import Link from "next/link";
import { UserRole } from "@prisma/client";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardTitle } from "@/components/ui/card";
import { requireAuth } from "@/lib/auth";
import { getSettings } from "@/lib/data";

export default async function SettingsPage() {
  const session = await requireAuth([UserRole.SUPER_ADMIN, UserRole.COMPANY_ADMIN]);
  const { tenant, settings } = await getSettings(session);
  const links = [
    ["/settings/company", "بيانات الشركة", "الهوية القانونية والتجارية"],
    ["/settings/credit-policy", "سياسة الائتمان", "قواعد التذكير والتصعيد وإيقاف الائتمان"],
    ["/settings/print", "إعدادات الطباعة", "الشعار، التذييل، التوقيع، وضريبة القيمة المضافة"],
    ["/settings/templates", "قوالب الرسائل", "SMS وواتساب حسب مراحل التحصيل"],
    ["/settings/integrations/sms", "تكامل SMS", "مزود الرسائل واسم المرسل"],
    ["/settings/integrations/whatsapp", "تكامل واتساب", "Cloud API أو QR Provider"]
  ];

  return (
    <>
      <PageHeader title="الإعدادات" description="مركز التحكم في هوية الشركة، سياسات الائتمان، الطباعة، القوالب، والتكاملات." />
      <section className="grid gap-6 xl:grid-cols-[.8fr_1.2fr]">
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
          <CardTitle>أقسام الإعدادات</CardTitle>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {links.map(([href, title, desc]) => (
              <Link key={href} href={href} className="rounded-md border border-border p-3 hover:border-primary">
                <p className="font-extrabold">{title}</p>
                <p className="mt-2 text-sm text-muted-foreground">{desc}</p>
              </Link>
            ))}
          </div>
        </Card>
      </section>
      <Card className="mt-6">
        <CardTitle>الإعدادات المحفوظة</CardTitle>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {settings.map((setting) => (
            <div key={setting.id} className="rounded-md border border-border p-3">
              <p className="font-extrabold">{setting.key}</p>
              <pre className="mt-2 max-h-52 overflow-auto whitespace-pre-wrap text-sm text-muted-foreground">{JSON.stringify(setting.value, null, 2)}</pre>
            </div>
          ))}
        </div>
      </Card>
    </>
  );
}
