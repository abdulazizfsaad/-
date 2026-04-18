import { Field, inputClass } from "@/components/form-field";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { requireAuth, tenantScope } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createCase } from "@/lib/server-actions";

export default async function NewCasePage() {
  const session = await requireAuth();
  const [customers, invoices, collectors] = await Promise.all([
    prisma.customer.findMany({ where: tenantScope(session) }),
    prisma.invoice.findMany({ where: { ...tenantScope(session), remainingAmount: { gt: 0 } }, include: { customer: true } }),
    prisma.user.findMany({ where: { ...tenantScope(session), role: "COLLECTOR" } })
  ]);
  return <><PageHeader title="قضية تحصيل جديدة" description="إنشاء قضية وربطها بعميل وفاتورة ومحصل." /><Card><form action={createCase} className="grid gap-4 md:grid-cols-2"><Field label="العميل"><select name="customerId" className={inputClass}>{customers.map((c) => <option key={c.id} value={c.id}>{c.companyName}</option>)}</select></Field><Field label="الفاتورة"><select name="invoiceId" className={inputClass}><option value="">بدون فاتورة</option>{invoices.map((i) => <option key={i.id} value={i.id}>{i.invoiceNumber} - {i.customer.companyName}</option>)}</select></Field><Field label="المبلغ المستحق"><input name="outstandingAmount" type="number" required className={inputClass} /></Field><Field label="الأولوية"><select name="priority" className={inputClass}><option value="LOW">منخفضة</option><option value="MEDIUM">متوسطة</option><option value="HIGH">عالية</option><option value="CRITICAL">حرجة</option></select></Field><Field label="المرحلة"><select name="stage" className={inputClass}><option value="NEW">جديدة</option><option value="PENDING_FOLLOW_UP">بانتظار المتابعة</option><option value="CONTACTED">تم التواصل</option></select></Field><Field label="المحصل"><select name="assignedCollectorId" className={inputClass}><option value="">غير مسند</option>{collectors.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</select></Field><Field label="المتابعة القادمة"><input name="nextFollowUpDate" type="date" className={inputClass} /></Field><Field label="ملاحظات"><textarea name="notes" className={inputClass} /></Field><button className="rounded-md bg-primary px-4 py-2 font-bold text-white">إنشاء القضية</button></form></Card></>;
}
