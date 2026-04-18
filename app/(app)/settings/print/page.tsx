import { UserRole } from "@prisma/client";
import { PageHeader } from "@/components/page-header";
import { Card, CardTitle } from "@/components/ui/card";
import { requireAuth } from "@/lib/auth";
import { getSettings } from "@/lib/data";
import { savePrintSettings } from "@/lib/server-actions";

type PrintSettings = {
  headerTitle?: string;
  footerNote?: string;
  showLogo?: boolean;
  showVat?: boolean;
  showCr?: boolean;
  paperSize?: string;
  reportSignature?: string;
};

export default async function PrintSettingsPage() {
  const session = await requireAuth([UserRole.COMPANY_ADMIN, UserRole.COLLECTION_MANAGER]);
  const { tenant, settings } = await getSettings(session);
  const print = (settings.find((item) => item.key === "print_settings")?.value ?? {}) as PrintSettings;

  return (
    <>
      <PageHeader title="إعدادات الطباعة" description="تجهيز شكل التقارير والفواتير المطبوعة: الشعار، بيانات ضريبة القيمة المضافة، التذييل، والتوقيع." />
      <section className="grid gap-6 xl:grid-cols-[.9fr_1.1fr]">
        <Card>
          <CardTitle>خيارات الطباعة</CardTitle>
          <form action={savePrintSettings} className="mt-4 grid gap-3">
            <input name="headerTitle" defaultValue={print.headerTitle ?? tenant?.name ?? ""} className="rounded-md border border-border px-3 py-2" placeholder="عنوان رأس الصفحة" />
            <textarea name="footerNote" defaultValue={print.footerNote ?? "هذا التقرير صادر من منصة ثمار للتحصيل."} className="rounded-md border border-border px-3 py-2" placeholder="ملاحظة التذييل" />
            <select name="paperSize" defaultValue={print.paperSize ?? "A4"} className="rounded-md border border-border px-3 py-2"><option value="A4">A4</option><option value="Letter">Letter</option></select>
            <input name="reportSignature" defaultValue={print.reportSignature ?? "إدارة التحصيل"} className="rounded-md border border-border px-3 py-2" placeholder="اسم التوقيع" />
            <label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" name="showLogo" defaultChecked={print.showLogo ?? true} /> إظهار الشعار</label>
            <label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" name="showVat" defaultChecked={print.showVat ?? true} /> إظهار الرقم الضريبي</label>
            <label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" name="showCr" defaultChecked={print.showCr ?? true} /> إظهار السجل التجاري</label>
            <button className="rounded-md bg-primary px-4 py-2 font-extrabold text-white">حفظ إعدادات الطباعة</button>
          </form>
        </Card>
        <Card className="bg-white print:shadow-none">
          <CardTitle>معاينة التقرير</CardTitle>
          <div className="mt-4 rounded-md border border-border p-5 text-sm leading-8">
            <div className="flex justify-between border-b border-border pb-4">
              <div>
                <p className="text-xl font-extrabold">{print.headerTitle ?? tenant?.name}</p>
                <p className="text-muted-foreground">{tenant?.address}</p>
              </div>
              <div className="grid size-16 place-items-center rounded-md border border-border text-xs text-muted-foreground">الشعار</div>
            </div>
            <div className="mt-4 grid gap-2">
              <p>تقرير تحصيل تنفيذي</p>
              <p>الرقم الضريبي: {tenant?.vatNumber ?? "-"}</p>
              <p>السجل التجاري: {tenant?.commercialRegistrationNumber ?? "-"}</p>
            </div>
            <div className="mt-8 border-t border-border pt-4 text-muted-foreground">{print.footerNote ?? "هذا التقرير صادر من منصة ثمار للتحصيل."}</div>
          </div>
        </Card>
      </section>
    </>
  );
}
