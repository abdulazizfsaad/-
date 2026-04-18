import { UserRole } from "@prisma/client";
import { PageHeader } from "@/components/page-header";
import { Card, CardTitle } from "@/components/ui/card";
import { requireAuth } from "@/lib/auth";
import { getSettings } from "@/lib/data";
import { updateCompanySettings } from "@/lib/server-actions";

export default async function CompanySettingsPage() {
  const session = await requireAuth([UserRole.SUPER_ADMIN, UserRole.COMPANY_ADMIN]);
  const { tenant } = await getSettings(session);
  return (
    <>
      <PageHeader title="إعدادات الشركة" description="تحديث الهوية القانونية والتجارية التي تظهر في التقارير، الطباعة، والفواتير." />
      <Card>
        <CardTitle>بيانات الشركة</CardTitle>
        <form action={updateCompanySettings} className="mt-4 grid gap-4 md:grid-cols-2">
          <input type="hidden" name="tenantId" value={tenant?.id ?? ""} />
          <label className="grid gap-1 text-sm font-bold">اسم الشركة<input name="name" defaultValue={tenant?.name ?? ""} className="rounded-md border border-border px-3 py-2 font-normal" /></label>
          <label className="grid gap-1 text-sm font-bold">البريد<input name="email" defaultValue={tenant?.email ?? ""} className="rounded-md border border-border px-3 py-2 font-normal" /></label>
          <label className="grid gap-1 text-sm font-bold">السجل التجاري<input name="commercialRegistrationNumber" defaultValue={tenant?.commercialRegistrationNumber ?? ""} className="rounded-md border border-border px-3 py-2 font-normal" /></label>
          <label className="grid gap-1 text-sm font-bold">الرقم الضريبي<input name="vatNumber" defaultValue={tenant?.vatNumber ?? ""} className="rounded-md border border-border px-3 py-2 font-normal" /></label>
          <label className="grid gap-1 text-sm font-bold">النشاط<input name="industry" defaultValue={tenant?.industry ?? ""} className="rounded-md border border-border px-3 py-2 font-normal" /></label>
          <label className="grid gap-1 text-sm font-bold">الدولة<input name="country" defaultValue={tenant?.country ?? "SA"} className="rounded-md border border-border px-3 py-2 font-normal" /></label>
          <label className="grid gap-1 text-sm font-bold">المدينة<input name="city" defaultValue={tenant?.city ?? ""} className="rounded-md border border-border px-3 py-2 font-normal" /></label>
          <label className="grid gap-1 text-sm font-bold">الهاتف<input name="phone" defaultValue={tenant?.phone ?? ""} className="rounded-md border border-border px-3 py-2 font-normal" /></label>
          <label className="grid gap-1 text-sm font-bold md:col-span-2">العنوان<input name="address" defaultValue={tenant?.address ?? ""} className="rounded-md border border-border px-3 py-2 font-normal" /></label>
          <label className="grid gap-1 text-sm font-bold md:col-span-2">رابط الشعار<input name="logoUrl" defaultValue={tenant?.logoUrl ?? ""} className="rounded-md border border-border px-3 py-2 font-normal" /></label>
          <div className="md:col-span-2"><button className="rounded-md bg-primary px-5 py-2 font-extrabold text-white">حفظ بيانات الشركة</button></div>
        </form>
      </Card>
    </>
  );
}
