import { notFound } from "next/navigation";
import { Field, inputClass } from "@/components/form-field";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { requireAuth, tenantScope } from "@/lib/auth";
import { getInvoice } from "@/lib/data";
import { prisma } from "@/lib/prisma";
import { updateInvoice } from "@/lib/server-actions";

function dateInput(date: Date) {
  return date.toISOString().slice(0, 10);
}

export default async function EditInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireAuth();
  const { id } = await params;
  const invoice = await getInvoice(session, id);
  if (!invoice) notFound();
  const [customers, collectors] = await Promise.all([
    prisma.customer.findMany({ where: tenantScope(session), orderBy: { companyName: "asc" } }),
    prisma.user.findMany({ where: { ...tenantScope(session), role: "COLLECTOR" } })
  ]);
  return (
    <>
      <PageHeader title="تعديل الفاتورة" description={invoice.invoiceNumber} />
      <Card>
        <form action={updateInvoice} className="grid gap-4 md:grid-cols-2">
          <input type="hidden" name="id" value={invoice.id} />
          <Field label="العميل"><select name="customerId" defaultValue={invoice.customerId} className={inputClass}>{customers.map((c) => <option key={c.id} value={c.id}>{c.companyName}</option>)}</select></Field>
          <Field label="رقم الفاتورة"><input name="invoiceNumber" defaultValue={invoice.invoiceNumber} required className={inputClass} /></Field>
          <Field label="تاريخ الفاتورة"><input name="invoiceDate" type="date" defaultValue={dateInput(invoice.invoiceDate)} required className={inputClass} /></Field>
          <Field label="تاريخ الاستحقاق"><input name="dueDate" type="date" defaultValue={dateInput(invoice.dueDate)} required className={inputClass} /></Field>
          <Field label="الإجمالي"><input name="totalAmount" type="number" defaultValue={invoice.totalAmount.toString()} required className={inputClass} /></Field>
          <Field label="المدفوع"><input name="paidAmount" type="number" defaultValue={invoice.paidAmount.toString()} className={inputClass} /></Field>
          <Field label="ضريبة القيمة المضافة"><input name="vatAmount" type="number" defaultValue={invoice.vatAmount.toString()} className={inputClass} /></Field>
          <Field label="العملة"><input name="currency" defaultValue={invoice.currency} className={inputClass} /></Field>
          <Field label="الحالة"><select name="status" defaultValue={invoice.status} className={inputClass}><option value="UNPAID">غير مدفوعة</option><option value="PARTIAL">جزئية</option><option value="PAID">مدفوعة</option><option value="OVERDUE">متأخرة</option><option value="DISPUTED">متنازع عليها</option><option value="ESCALATED">مصعدة</option></select></Field>
          <Field label="المحصل"><select name="assignedCollectorId" defaultValue={invoice.assignedCollectorId ?? ""} className={inputClass}><option value="">غير مسند</option>{collectors.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</select></Field>
          <button className="self-end rounded-md bg-primary px-4 py-2 font-bold text-white">حفظ التعديلات</button>
        </form>
      </Card>
    </>
  );
}
