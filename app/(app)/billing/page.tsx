import { PageHeader } from "@/components/page-header";
import { Card, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { requireAuth } from "@/lib/auth";
import { getBillingData } from "@/lib/data";
import { formatDate, formatMoney } from "@/lib/utils";
import { subscriptionStatusLabels } from "@/lib/labels";

export default async function BillingPage() {
  const session = await requireAuth();
  const { subscription, usage } = await getBillingData(session);
  const plan = subscription?.plan;
  const limits = [
    ["المستخدمون", usage.users, plan?.maxUsers],
    ["العملاء", usage.customers, plan?.maxCustomers],
    ["الفواتير", usage.invoices, plan?.maxInvoices],
    ["رسائل SMS هذا الشهر", usage.smsThisMonth, plan?.maxSmsPerMonth],
    ["حسابات واتساب", usage.whatsappAccounts, plan?.maxWhatsAppAccounts]
  ];
  return (
    <>
      <PageHeader title="الاشتراك والفوترة" description="إدارة الخطة الحالية، حالة التجربة، وحدود الاستخدام مع تجهيز تكاملات الدفع المستقبلية." />
      <section className="grid gap-6 xl:grid-cols-[.9fr_1.1fr]">
        <Card>
          <CardTitle>الخطة الحالية</CardTitle>
          <p className="mt-4 text-3xl font-extrabold">{plan?.name ?? "غير محددة"}</p>
          <p className="mt-2 text-sm text-muted-foreground">حالة الاشتراك: {subscription ? <Badge tone="success">{subscriptionStatusLabels[subscription.status]}</Badge> : "-"}</p>
          <p className="mt-4 text-sm">تاريخ البداية: {formatDate(subscription?.startDate)}</p>
          <p className="mt-2 text-sm">تاريخ التجديد: {formatDate(subscription?.nextBillingDate)}</p>
          <p className="mt-2 text-sm">المبلغ: {subscription ? formatMoney(subscription.amount.toString(), subscription.currency) : "-"}</p>
          <button className="mt-6 rounded-md bg-primary px-4 py-2 text-sm font-bold text-white">ترقية الباقة</button>
        </Card>
        <Card>
          <CardTitle>الاستخدام الحالي</CardTitle>
          <div className="mt-4 grid gap-3">
            {limits.map(([label, used, max]) => <div key={String(label)} className="rounded-md border border-border p-3"><div className="flex justify-between text-sm font-bold"><span>{label}</span><span>{used} / {max ?? "-"}</span></div><div className="mt-2 h-2 rounded bg-muted"><div className="h-2 rounded bg-primary" style={{ width: `${max ? Math.min(100, (Number(used) / Number(max)) * 100) : 0}%` }} /></div></div>)}
          </div>
          <p className="mt-4 text-sm text-muted-foreground">مهيأ لاحقاً لتكامل Moyasar وHyperPay وStripe وTap Payments.</p>
        </Card>
      </section>
    </>
  );
}
