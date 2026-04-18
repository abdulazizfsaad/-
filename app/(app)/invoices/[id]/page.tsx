import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardTitle } from "@/components/ui/card";
import { requireAuth } from "@/lib/auth";
import { getInvoice } from "@/lib/data";
import { invoiceStatusLabels } from "@/lib/labels";
import { formatDate, formatMoney } from "@/lib/utils";

export default async function InvoiceDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireAuth();
  const { id } = await params;
  const invoice = await getInvoice(session, id);
  if (!invoice) notFound();
  return <><PageHeader title={invoice.invoiceNumber} description={invoice.customer.companyName} /><section className="grid gap-4 lg:grid-cols-4"><Card><p>الإجمالي</p><p className="text-2xl font-extrabold">{formatMoney(invoice.totalAmount.toString())}</p></Card><Card><p>المدفوع</p><p className="text-2xl font-extrabold">{formatMoney(invoice.paidAmount.toString())}</p></Card><Card><p>المتبقي</p><p className="text-2xl font-extrabold">{formatMoney(invoice.remainingAmount.toString())}</p></Card><Card><Badge>{invoiceStatusLabels[invoice.status]}</Badge><p className="mt-3 text-sm">تأخير {invoice.overdueDays} يوم</p></Card></section><Card className="mt-6"><CardTitle>السداد والقضايا</CardTitle><p className="mt-3 text-sm text-muted-foreground">الاستحقاق: {formatDate(invoice.dueDate)} | المحصل: {invoice.assignedCollector?.name ?? "-"}</p></Card></>;
}
