import { Field, inputClass } from "@/components/form-field";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { requireAuth } from "@/lib/auth";
import { tenantScope } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createInvoice } from "@/lib/server-actions";

export default async function NewInvoicePage() {
  const session = await requireAuth();
  const [customers, collectors] = await Promise.all([prisma.customer.findMany({ where: tenantScope(session) }), prisma.user.findMany({ where: { ...tenantScope(session), role: "COLLECTOR" } })]);
  return (
    <>
      <PageHeader title="فاتورة جديدة" description="إضافة فاتورة وحساب المتبقي والتأخير وإنشاء حالة تحصيل عند الحاجة." />
      <Card><form action={createInvoice} className="grid gap-4 md:grid-cols-2">
        <Field label="العميل"><select name="customerId" className={inputClass}>{customers.map((c) => <option key={c.id} value={c.id}>{c.companyName}</option>)}</select></Field>
        <Field label="رقم الفاتورة"><input name="invoiceNumber" required className={inputClass} /></Field>
        <Field label="تاريخ الفاتورة"><input name="invoiceDate" type="date" required className={inputClass} /></Field>
        <Field label="تاريخ الاستحقاق"><input name="dueDate" type="date" required className={inputClass} /></Field>
        <Field label="الإجمالي"><input name="totalAmount" type="number" required className={inputClass} /></Field>
        <Field label="المدفوع"><input name="paidAmount" type="number" defaultValue="0" className={inputClass} /></Field>
        <Field label="ضريبة القيمة المضافة"><input name="vatAmount" type="number" className={inputClass} /></Field>
        <Field label="العملة"><input name="currency" defaultValue="SAR" className={inputClass} /></Field>
        <Field label="المحصل"><select name="assignedCollectorId" className={inputClass}><option value="">غير مسند</option>{collectors.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</select></Field>
        <button className="self-end rounded-md bg-primary px-4 py-2 font-bold text-white">حفظ الفاتورة</button>
      </form></Card>
    </>
  );
}
