import { SubscriptionStatus, UserRole } from "@prisma/client";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { requireAuth } from "@/lib/auth";
import { getAdminTenants, getPlans } from "@/lib/data";
import { subscriptionStatusLabels } from "@/lib/labels";
import { changeTenantPlan, updateTenantStatus } from "@/lib/server-actions";

export default async function AdminTenantsPage() {
  await requireAuth([UserRole.SUPER_ADMIN]);
  const [tenants, plans] = await Promise.all([getAdminTenants(), getPlans()]);
  return (
    <>
      <PageHeader title="إدارة الشركات" description="لوحة مدير النظام لمتابعة الشركات، الاشتراكات، الاستخدام، التفعيل، وتغيير الباقات." />
      <Card className="overflow-x-auto">
        <table className="w-full min-w-[1180px] text-sm">
          <thead className="text-muted-foreground">
            <tr className="border-b text-right">
              <th className="py-3">الشركة</th><th>الباقة</th><th>الحالة</th><th>المستخدمون</th><th>العملاء</th><th>الفواتير</th><th>تفعيل</th><th>تغيير الباقة</th>
            </tr>
          </thead>
          <tbody>
            {tenants.map((tenant) => (
              <tr key={tenant.id} className="border-b align-top">
                <td className="py-3 font-bold">{tenant.name}</td>
                <td>{tenant.subscriptionPlan?.name}</td>
                <td><Badge>{subscriptionStatusLabels[tenant.subscriptionStatus]}</Badge></td>
                <td>{tenant._count.users}</td>
                <td>{tenant._count.customers}</td>
                <td>{tenant._count.invoices}</td>
                <td>
                  <form action={updateTenantStatus} className="flex gap-2">
                    <input type="hidden" name="tenantId" value={tenant.id} />
                    <select name="status" defaultValue={tenant.subscriptionStatus} className="rounded-md border px-2 py-1">
                      {Object.values(SubscriptionStatus).map((status) => <option key={status} value={status}>{subscriptionStatusLabels[status]}</option>)}
                    </select>
                    <button className="rounded-md bg-primary px-3 py-1 text-white">حفظ</button>
                  </form>
                </td>
                <td>
                  <form action={changeTenantPlan} className="grid gap-2">
                    <input type="hidden" name="tenantId" value={tenant.id} />
                    <select name="planId" defaultValue={tenant.subscriptionPlanId ?? ""} className="rounded-md border px-2 py-1">
                      {plans.map((plan) => <option key={plan.id} value={plan.id}>{plan.name}</option>)}
                    </select>
                    <div className="flex gap-2">
                      <select name="status" defaultValue={tenant.subscriptionStatus} className="rounded-md border px-2 py-1">
                        <option value="TRIAL">تجربة</option><option value="ACTIVE">نشط</option><option value="SUSPENDED">معلق</option>
                      </select>
                      <button className="rounded-md border border-border px-3 py-1 font-bold">تطبيق</button>
                    </div>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  );
}
