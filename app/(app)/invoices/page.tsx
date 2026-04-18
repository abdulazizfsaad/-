import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { requireAuth } from "@/lib/auth";
import { getInvoices } from "@/lib/data";
import { invoiceStatusLabels } from "@/lib/labels";
import { formatDate, formatMoney, overdueDays } from "@/lib/utils";

export default async function InvoicesPage() {
  const session = await requireAuth();
  const invoices = await getInvoices(session);
  return (
    <>
      <PageHeader title="الفواتير" description="متابعة الفواتير، تواريخ الاستحقاق، المبالغ المدفوعة، والمتبقية مع المحصل المسؤول." action={<a href="/invoices/new" className="rounded-md bg-primary px-4 py-2 text-sm font-bold text-white">إضافة فاتورة</a>} />
      <Card className="overflow-x-auto">
        <div className="mb-4 flex flex-wrap gap-3">
          <input className="w-full max-w-sm rounded-md border border-border px-3 py-2 text-sm" placeholder="بحث برقم الفاتورة أو العميل" />
          <select className="rounded-md border border-border px-3 py-2 text-sm"><option>كل حالات السداد</option></select>
        </div>
        <table className="w-full min-w-[1050px] text-sm">
          <thead className="text-muted-foreground"><tr className="border-b border-border text-right"><th className="py-3">رقم الفاتورة</th><th>العميل</th><th>تاريخ الفاتورة</th><th>الاستحقاق</th><th>الإجمالي</th><th>المدفوع</th><th>المتبقي</th><th>الضريبة</th><th>التأخير</th><th>المحصل</th><th>الحالة</th><th>المرفق</th></tr></thead>
          <tbody>
            {invoices.map((invoice) => (
              <tr key={invoice.id} className="border-b border-border">
                <td className="py-3 font-extrabold"><a className="text-primary" href={`/invoices/${invoice.id}`}>{invoice.invoiceNumber}</a></td><td>{invoice.customer.companyName}</td><td>{formatDate(invoice.invoiceDate)}</td><td>{formatDate(invoice.dueDate)}</td><td>{formatMoney(invoice.totalAmount.toString(), invoice.currency)}</td><td>{formatMoney(invoice.paidAmount.toString(), invoice.currency)}</td><td className="font-extrabold">{formatMoney(invoice.remainingAmount.toString(), invoice.currency)}</td><td>{formatMoney(invoice.vatAmount.toString(), invoice.currency)}</td><td>{invoice.overdueDays || overdueDays(invoice.dueDate)} يوم</td><td>{invoice.assignedCollector?.name ?? "-"}</td><td><Badge tone={invoice.status === "OVERDUE" ? "danger" : invoice.status === "PAID" ? "success" : "warning"}>{invoiceStatusLabels[invoice.status]}</Badge></td><td>{invoice.attachmentUrl ? "مرفق" : "لا يوجد"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  );
}
