import { UserRole } from "@prisma/client";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { requireAuth } from "@/lib/auth";
import { getPlans } from "@/lib/data";
import { formatMoney } from "@/lib/utils";

export default async function AdminPlansPage() {
  await requireAuth([UserRole.SUPER_ADMIN]);
  const plans = await getPlans();
  return (
    <>
      <PageHeader title="إدارة الباقات" description="باقات Starter وGrowth وBusiness وEnterprise مع الحدود والخصائص." />
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">{plans.map((plan) => <Card key={plan.id}><p className="text-sm text-muted-foreground">{plan.code}</p><h2 className="mt-2 text-2xl font-extrabold">{plan.name}</h2><p className="mt-3 text-xl font-bold">{formatMoney(plan.monthlyPrice.toString())}</p><div className="mt-4 grid gap-1 text-sm text-muted-foreground"><p>{plan.maxUsers} مستخدم</p><p>{plan.maxCustomers} عميل</p><p>{plan.maxInvoices} فاتورة</p><p>{plan.maxSmsPerMonth} رسالة SMS</p></div><button className="mt-4 rounded-md border border-border px-3 py-2 text-sm font-bold">تعديل الحدود</button></Card>)}</section>
    </>
  );
}
