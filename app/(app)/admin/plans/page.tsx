import { PlanStatus, UserRole } from "@prisma/client";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardTitle } from "@/components/ui/card";
import { requireAuth } from "@/lib/auth";
import { getPlans } from "@/lib/data";
import { updateSubscriptionPlan } from "@/lib/server-actions";
import { formatMoney } from "@/lib/utils";

export default async function AdminPlansPage() {
  await requireAuth([UserRole.SUPER_ADMIN]);
  const plans = await getPlans();
  return (
    <>
      <PageHeader title="إدارة الباقات" description="تفعيل حدود Starter وGrowth وBusiness وEnterprise مع جاهزية للفوترة وبوابات الدفع لاحقًا." />
      <section className="grid gap-4 xl:grid-cols-2">
        {plans.map((plan) => (
          <Card key={plan.id}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm text-muted-foreground">{plan.code}</p>
                <CardTitle>{plan.name}</CardTitle>
                <p className="mt-2 text-xl font-extrabold">{formatMoney(plan.monthlyPrice.toString())} / شهر</p>
              </div>
              <Badge tone={plan.status === PlanStatus.ACTIVE ? "success" : "danger"}>{plan.status === PlanStatus.ACTIVE ? "نشطة" : "معطلة"}</Badge>
            </div>
            <form action={updateSubscriptionPlan} className="mt-5 grid gap-3 md:grid-cols-2">
              <input type="hidden" name="id" value={plan.id} />
              <label className="grid gap-1 text-sm font-bold">اسم الباقة<input name="name" defaultValue={plan.name} className="rounded-md border border-border px-3 py-2 font-normal" /></label>
              <label className="grid gap-1 text-sm font-bold">الحالة<select name="status" defaultValue={plan.status} className="rounded-md border border-border px-3 py-2 font-normal"><option value="ACTIVE">نشطة</option><option value="DISABLED">معطلة</option></select></label>
              <label className="grid gap-1 text-sm font-bold">السعر الشهري<input name="monthlyPrice" type="number" defaultValue={plan.monthlyPrice.toString()} className="rounded-md border border-border px-3 py-2 font-normal" /></label>
              <label className="grid gap-1 text-sm font-bold">السعر السنوي<input name="yearlyPrice" type="number" defaultValue={plan.yearlyPrice.toString()} className="rounded-md border border-border px-3 py-2 font-normal" /></label>
              <label className="grid gap-1 text-sm font-bold">المستخدمون<input name="maxUsers" type="number" defaultValue={plan.maxUsers} className="rounded-md border border-border px-3 py-2 font-normal" /></label>
              <label className="grid gap-1 text-sm font-bold">العملاء<input name="maxCustomers" type="number" defaultValue={plan.maxCustomers} className="rounded-md border border-border px-3 py-2 font-normal" /></label>
              <label className="grid gap-1 text-sm font-bold">الفواتير<input name="maxInvoices" type="number" defaultValue={plan.maxInvoices} className="rounded-md border border-border px-3 py-2 font-normal" /></label>
              <label className="grid gap-1 text-sm font-bold">حسابات واتساب<input name="maxWhatsAppAccounts" type="number" defaultValue={plan.maxWhatsAppAccounts} className="rounded-md border border-border px-3 py-2 font-normal" /></label>
              <label className="grid gap-1 text-sm font-bold">SMS شهريًا<input name="maxSmsPerMonth" type="number" defaultValue={plan.maxSmsPerMonth} className="rounded-md border border-border px-3 py-2 font-normal" /></label>
              <div className="flex items-end"><button className="w-full rounded-md bg-primary px-4 py-2 text-sm font-extrabold text-white">حفظ الباقة</button></div>
            </form>
          </Card>
        ))}
      </section>
    </>
  );
}
