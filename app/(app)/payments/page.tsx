import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardTitle } from "@/components/ui/card";
import { requireAuth } from "@/lib/auth";
import { getPaymentFormOptions, getPayments } from "@/lib/data";
import { paymentMethodLabels } from "@/lib/labels";
import { formatDate, formatMoney } from "@/lib/utils";
import { addPayment } from "./actions";

export default async function PaymentsPage() {
  const session = await requireAuth();
  const [payments, options] = await Promise.all([getPayments(session), getPaymentFormOptions(session)]);
  return (
    <>
      <PageHeader title="المدفوعات" description="تسجيل السداد الجزئي أو الكامل وتخصيص المدفوعات على الفواتير." />
      <section className="grid gap-6 xl:grid-cols-[.75fr_1.25fr]">
        <Card>
          <CardTitle>إضافة دفعة</CardTitle>
          <form action={addPayment} className="mt-4 grid gap-3">
            <select name="invoiceId" className="rounded-md border border-border px-3 py-2 text-sm" required>
              <option value="">اختر فاتورة مفتوحة</option>
              {options.invoices.map((invoice) => (
                <option key={invoice.id} value={invoice.id}>
                  {invoice.invoiceNumber} - {invoice.customer.companyName} - {formatMoney(invoice.remainingAmount.toString(), invoice.currency)}
                </option>
              ))}
            </select>
            <input name="amount" type="number" min="1" step="0.01" className="rounded-md border border-border px-3 py-2 text-sm" placeholder="المبلغ" required />
            <select name="method" className="rounded-md border border-border px-3 py-2 text-sm">
              <option value="BANK_TRANSFER">تحويل بنكي</option><option value="SADAD">سداد</option><option value="CHEQUE">شيك</option><option value="CASH">نقداً</option><option value="CARD">بطاقة</option>
            </select>
            <input name="reference" className="rounded-md border border-border px-3 py-2 text-sm" placeholder="مرجع العملية" />
            <textarea name="notes" className="min-h-24 rounded-md border border-border px-3 py-2 text-sm" placeholder="ملاحظات الدفعة" />
            <button className="rounded-md bg-primary px-4 py-2 text-sm font-bold text-white">تسجيل وتخصيص الدفعة</button>
          </form>
        </Card>
        <Card className="overflow-x-auto">
          <CardTitle>سجل المدفوعات</CardTitle>
          <table className="mt-4 w-full min-w-[820px] text-sm">
            <thead className="text-muted-foreground"><tr className="border-b border-border text-right"><th className="py-3">رقم الدفعة</th><th>العميل</th><th>التاريخ</th><th>المبلغ</th><th>الطريقة</th><th>المسجل</th><th>الفاتورة</th></tr></thead>
            <tbody>{payments.map((payment) => <tr key={payment.id} className="border-b border-border"><td className="py-3 font-bold">{payment.paymentNumber}</td><td>{payment.customer.companyName}</td><td>{formatDate(payment.paymentDate)}</td><td>{formatMoney(payment.amount.toString())}</td><td><Badge tone="success">{paymentMethodLabels[payment.method]}</Badge></td><td>{payment.createdBy?.name ?? "-"}</td><td>{payment.invoice?.invoiceNumber ?? "-"}</td></tr>)}</tbody>
          </table>
        </Card>
      </section>
    </>
  );
}
