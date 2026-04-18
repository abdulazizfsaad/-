import { UserRole } from "@prisma/client";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { requireAuth } from "@/lib/auth";
import { getAdminTenants } from "@/lib/data";
import { subscriptionStatusLabels } from "@/lib/labels";
import { updateTenantStatus } from "@/lib/server-actions";

export default async function AdminTenantsPage() {
  await requireAuth([UserRole.SUPER_ADMIN]);
  const tenants = await getAdminTenants();
  return (
    <>
      <PageHeader title="إدارة الشركات" description="لوحة مدير النظام لمتابعة الشركات، الاشتراكات، الاستخدام، والتفعيل." />
      <Card className="overflow-x-auto"><table className="w-full min-w-[900px] text-sm"><thead className="text-muted-foreground"><tr className="border-b text-right"><th className="py-3">الشركة</th><th>الباقة</th><th>الحالة</th><th>المستخدمون</th><th>العملاء</th><th>الفواتير</th><th>إجراء</th></tr></thead><tbody>{tenants.map((tenant) => <tr key={tenant.id} className="border-b"><td className="py-3 font-bold">{tenant.name}</td><td>{tenant.subscriptionPlan?.name}</td><td><Badge>{subscriptionStatusLabels[tenant.subscriptionStatus]}</Badge></td><td>{tenant._count.users}</td><td>{tenant._count.customers}</td><td>{tenant._count.invoices}</td><td><form action={updateTenantStatus} className="flex gap-2"><input type="hidden" name="tenantId" value={tenant.id} /><select name="status" className="rounded-md border px-2 py-1"><option value="ACTIVE">تفعيل</option><option value="SUSPENDED">تعليق</option></select><button className="rounded-md bg-primary px-3 py-1 text-white">حفظ</button></form></td></tr>)}</tbody></table></Card>
    </>
  );
}
