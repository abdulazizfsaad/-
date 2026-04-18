import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardTitle } from "@/components/ui/card";
import { requireAuth } from "@/lib/auth";
import { getCustomer } from "@/lib/data";
import { caseStageLabels, customerStatusLabels, invoiceStatusLabels, promiseStatusLabels, riskLevelLabels } from "@/lib/labels";
import { formatDate, formatMoney, overdueDays } from "@/lib/utils";
import { deleteCustomer } from "@/lib/server-actions";

type BadgeTone = "default" | "info" | "success" | "warning" | "danger";

export default async function CustomerDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireAuth();
  const { id } = await params;
  const customer = await getCustomer(session, id);
  if (!customer) notFound();

  const openInvoices = customer.invoices.filter((invoice) => Number(invoice.remainingAmount) > 0);
  const overdueInvoices = openInvoices.filter((invoice) => overdueDays(invoice.dueDate) > 0);
  const creditUtilization = Number(customer.creditLimit) > 0 ? Math.round((Number(customer.outstandingBalance) / Number(customer.creditLimit)) * 100) : 0;
  const brokenPromises = customer.promises.filter((promise) => promise.status === "BROKEN" || (promise.status === "PENDING" && promise.promiseDate < new Date()));
  const timeline: Array<{ id: string; date: Date; title: string; body: string; tone: BadgeTone }> = [
    ...customer.invoices.map((invoice) => ({ id: `invoice-${invoice.id}`, date: invoice.createdAt, title: `فاتورة ${invoice.invoiceNumber}`, body: `${invoiceStatusLabels[invoice.status]} - المتبقي ${formatMoney(invoice.remainingAmount.toString())}`, tone: invoice.status === "OVERDUE" ? "danger" as const : "info" as const })),
    ...customer.cases.flatMap((item) => [
      { id: `case-${item.id}`, date: item.createdAt, title: `قضية ${item.caseNumber}`, body: `${caseStageLabels[item.stage]} - ${formatMoney(item.outstandingAmount.toString())}`, tone: item.stage === "ESCALATED" ? "danger" as const : "warning" as const },
      ...item.activities.map((activity) => ({ id: `activity-${activity.id}`, date: activity.createdAt, title: "نشاط تواصل", body: activity.summary, tone: "default" as const }))
    ]),
    ...customer.payments.map((payment) => ({ id: `payment-${payment.id}`, date: payment.paymentDate, title: `دفعة ${payment.paymentNumber}`, body: `${formatMoney(payment.amount.toString())} - ${payment.invoice?.invoiceNumber ?? "بدون فاتورة"}`, tone: "success" as const })),
    ...customer.promises.map((promise) => ({ id: `promise-${promise.id}`, date: promise.promiseDate, title: "وعد سداد", body: `${promiseStatusLabels[promise.status]} - ${formatMoney(promise.promisedAmount.toString())}`, tone: promise.status === "BROKEN" ? "danger" as const : "info" as const })),
    ...customer.smsMessages.map((message) => ({ id: `sms-${message.id}`, date: message.createdAt, title: "رسالة SMS", body: message.messageBody, tone: "default" as const })),
    ...customer.whatsappMessages.map((message) => ({ id: `wa-${message.id}`, date: message.createdAt, title: "رسالة واتساب", body: message.messageBody, tone: "default" as const }))
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <>
      <PageHeader
        title={customer.companyName}
        description={`${customer.name} | ${customer.city ?? "-"} | الرقم الضريبي ${customer.vatNumber ?? "-"}`}
        action={
          <div className="flex gap-2">
            <Link href={`/customers/${customer.id}/edit`} className="rounded-md bg-primary px-4 py-2 text-sm font-bold text-white">تعديل</Link>
            <form action={deleteCustomer}>
              <input type="hidden" name="id" value={customer.id} />
              <button className="rounded-md border border-rose-200 px-4 py-2 text-sm font-bold text-rose-700">تعطيل العميل</button>
            </form>
          </div>
        }
      />

      <section className="grid gap-4 lg:grid-cols-4">
        <Card><p className="text-sm text-muted-foreground">الرصيد الحالي</p><p className="mt-2 text-2xl font-extrabold">{formatMoney(customer.outstandingBalance.toString())}</p></Card>
        <Card><p className="text-sm text-muted-foreground">حد الائتمان</p><p className="mt-2 text-2xl font-extrabold">{formatMoney(customer.creditLimit.toString())}</p></Card>
        <Card><p className="text-sm text-muted-foreground">استخدام الائتمان</p><p className="mt-2 text-2xl font-extrabold">{creditUtilization}%</p></Card>
        <Card><p className="text-sm text-muted-foreground">المخاطر</p><p className="mt-3"><Badge tone={customer.riskLevel === "CRITICAL" || customer.riskLevel === "HIGH" ? "danger" : "info"}>{riskLevelLabels[customer.riskLevel]}</Badge></p></Card>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[.85fr_1.15fr]">
        <Card className="bg-slate-950 text-white">
          <CardTitle className="text-white">ملف تنفيذي للعميل</CardTitle>
          <div className="mt-4 grid gap-3 text-sm">
            <p className="flex justify-between gap-3"><span className="text-white/70">الحالة</span><Badge>{customerStatusLabels[customer.status]}</Badge></p>
            <p className="flex justify-between gap-3"><span className="text-white/70">فواتير مفتوحة</span><span className="font-extrabold">{openInvoices.length}</span></p>
            <p className="flex justify-between gap-3"><span className="text-white/70">فواتير متأخرة</span><span className="font-extrabold">{overdueInvoices.length}</span></p>
            <p className="flex justify-between gap-3"><span className="text-white/70">وعود مكسورة</span><span className="font-extrabold">{brokenPromises.length}</span></p>
            <p className="flex justify-between gap-3"><span className="text-white/70">شروط السداد</span><span className="font-extrabold">{customer.paymentTerms} يوم</span></p>
          </div>
          <div className="mt-5 rounded-md border border-white/15 p-3 text-sm leading-7 text-white/80">
            {creditUtilization > 100 || brokenPromises.length > 0
              ? "التوصية: إيقاف ائتمان مؤقت وطلب دفعة فورية أو خطة سداد معتمدة."
              : overdueInvoices.length > 0
                ? "التوصية: متابعة رسمية وتحديد موعد سداد مكتوب."
                : "التوصية: متابعة وقائية والمحافظة على العلاقة التجارية."}
          </div>
        </Card>
        <Card>
          <CardTitle>الخط الزمني الموحد</CardTitle>
          <div className="mt-4 grid max-h-[520px] gap-3 overflow-y-auto pl-2">
            {timeline.slice(0, 30).map((event) => (
              <div key={event.id} className="rounded-md border border-border p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-extrabold">{event.title}</p>
                  <div className="flex items-center gap-2">
                    <Badge tone={event.tone}>{formatDate(event.date)}</Badge>
                  </div>
                </div>
                <p className="mt-2 text-sm leading-7 text-muted-foreground">{event.body}</p>
              </div>
            ))}
          </div>
        </Card>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-2">
        <Card>
          <CardTitle>الفواتير</CardTitle>
          <div className="mt-4 grid gap-3">
            {customer.invoices.map((invoice) => (
              <Link key={invoice.id} href={`/invoices/${invoice.id}`} className="rounded-md border border-border p-3 hover:border-primary">
                <div className="flex justify-between gap-3">
                  <p className="font-extrabold">{invoice.invoiceNumber}</p>
                  <Badge tone={invoice.status === "OVERDUE" ? "danger" : "info"}>{invoiceStatusLabels[invoice.status]}</Badge>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">المتبقي {formatMoney(invoice.remainingAmount.toString())} | تأخير {overdueDays(invoice.dueDate)} يوم</p>
              </Link>
            ))}
          </div>
        </Card>
        <Card>
          <CardTitle>حالات ووعود السداد</CardTitle>
          <div className="mt-4 grid gap-3">
            {customer.cases.map((item) => (
              <Link key={item.id} href={`/cases/${item.id}`} className="rounded-md border border-border p-3 hover:border-primary">
                <p className="font-extrabold">{item.caseNumber}</p>
                <p className="mt-2 text-sm text-muted-foreground">{caseStageLabels[item.stage]} | {item.assignedCollector?.name ?? "غير مسند"} | {formatDate(item.nextFollowUpDate)}</p>
              </Link>
            ))}
            {customer.promises.map((promise) => (
              <div key={promise.id} className="rounded-md bg-muted p-3">
                <p className="font-extrabold">{formatMoney(promise.promisedAmount.toString())}</p>
                <p className="mt-2 text-sm text-muted-foreground">{promiseStatusLabels[promise.status]} | {formatDate(promise.promiseDate)} | {promise.committedBy}</p>
              </div>
            ))}
          </div>
        </Card>
      </section>
    </>
  );
}
