import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardTitle } from "@/components/ui/card";
import { requireAuth } from "@/lib/auth";
import { getCustomer } from "@/lib/data";
import { caseStageLabels, customerStatusLabels, invoiceStatusLabels, promiseStatusLabels } from "@/lib/labels";
import { formatDate, formatMoney, overdueDays } from "@/lib/utils";

export default async function CustomerDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireAuth();
  const { id } = await params;
  const customer = await getCustomer(session, id);
  if (!customer) notFound();
  return (
    <>
      <PageHeader title={customer.companyName} description={`${customer.name} | ${customer.city ?? "-"} | الرقم الضريبي ${customer.vatNumber ?? "-"}`} />
      <section className="grid gap-4 lg:grid-cols-4">
        <Card><p className="text-sm text-muted-foreground">الرصيد الحالي</p><p className="mt-2 text-2xl font-extrabold">{formatMoney(customer.outstandingBalance.toString())}</p></Card>
        <Card><p className="text-sm text-muted-foreground">حد الائتمان</p><p className="mt-2 text-2xl font-extrabold">{formatMoney(customer.creditLimit.toString())}</p></Card>
        <Card><p className="text-sm text-muted-foreground">شروط السداد</p><p className="mt-2 text-2xl font-extrabold">{customer.paymentTerms} يوم</p></Card>
        <Card><p className="text-sm text-muted-foreground">الحالة</p><p className="mt-3"><Badge>{customerStatusLabels[customer.status]}</Badge></p></Card>
      </section>
      <section className="mt-6 grid gap-6 xl:grid-cols-2">
        <Card>
          <CardTitle>الفواتير</CardTitle>
          <div className="mt-4 grid gap-3">
            {customer.invoices.map((invoice) => (
              <div key={invoice.id} className="rounded-md border border-border p-3">
                <div className="flex justify-between"><p className="font-extrabold">{invoice.invoiceNumber}</p><Badge tone={invoice.status === "OVERDUE" ? "danger" : "info"}>{invoiceStatusLabels[invoice.status]}</Badge></div>
                <p className="mt-2 text-sm text-muted-foreground">المتبقي {formatMoney(invoice.remainingAmount.toString())} | تأخير {overdueDays(invoice.dueDate)} يوم</p>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <CardTitle>حالات ووعود السداد</CardTitle>
          <div className="mt-4 grid gap-3">
            {customer.cases.map((item) => <div key={item.id} className="rounded-md border border-border p-3"><p className="font-extrabold">{item.caseNumber}</p><p className="mt-2 text-sm text-muted-foreground">{caseStageLabels[item.stage]} | {item.assignedCollector?.name ?? "غير مسند"} | {formatDate(item.nextFollowUpDate)}</p></div>)}
            {customer.promises.map((promise) => <div key={promise.id} className="rounded-md bg-muted p-3"><p className="font-extrabold">{formatMoney(promise.promisedAmount.toString())}</p><p className="mt-2 text-sm text-muted-foreground">{promiseStatusLabels[promise.status]} | {formatDate(promise.promiseDate)} | {promise.committedBy}</p></div>)}
          </div>
        </Card>
      </section>
    </>
  );
}
