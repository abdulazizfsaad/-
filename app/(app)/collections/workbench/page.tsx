import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardTitle } from "@/components/ui/card";
import { requireAuth } from "@/lib/auth";
import { getCollectionsIntelligence } from "@/lib/collections-intelligence";
import { priorityLabels } from "@/lib/labels";
import { formatMoney } from "@/lib/utils";

const riskTone = {
  منخفض: "success",
  متوسط: "info",
  مرتفع: "warning",
  حرج: "danger"
} as const;

export default async function CollectionsWorkbenchPage() {
  const session = await requireAuth();
  const intelligence = await getCollectionsIntelligence(session);
  const aging = [
    ["غير متأخر", intelligence.aging.current],
    ["1-30 يوم", intelligence.aging.d1To30],
    ["31-60 يوم", intelligence.aging.d31To60],
    ["61-90 يوم", intelligence.aging.d61To90],
    ["أكثر من 90 يوم", intelligence.aging.d90Plus]
  ];

  return (
    <>
      <PageHeader
        title="مركز التحصيل الذكي"
        description="قائمة تشغيل يومية ترتب الحسابات حسب المخاطر، مبلغ التعرض، عمر الدين، الوعود المكسورة، وحالة التصعيد."
        action={<Link href="/cases/new" className="rounded-md bg-primary px-4 py-2 text-sm font-extrabold text-white">فتح قضية تحصيل</Link>}
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="bg-slate-950 text-white">
          <p className="text-sm font-bold text-white/70">صحة التحصيل</p>
          <p className="mt-3 text-4xl font-extrabold">{intelligence.summary.healthScore}%</p>
          <p className="mt-2 text-xs text-white/70">كلما ارتفعت النسبة انخفض خطر التعثر.</p>
        </Card>
        <Card>
          <p className="text-sm font-bold text-muted-foreground">تعرض حرج</p>
          <p className="mt-3 text-3xl font-extrabold">{formatMoney(intelligence.summary.criticalExposure)}</p>
          <p className="mt-2 text-xs text-muted-foreground">{intelligence.summary.criticalAccounts} حسابات حرجة</p>
        </Card>
        <Card>
          <p className="text-sm font-bold text-muted-foreground">وعود مكسورة</p>
          <p className="mt-3 text-3xl font-extrabold">{intelligence.summary.brokenPromises}</p>
          <p className="mt-2 text-xs text-muted-foreground">تحتاج اتصالًا مباشرًا وتوثيق نتيجة.</p>
        </Card>
        <Card>
          <p className="text-sm font-bold text-muted-foreground">محصل آخر 30 يوم</p>
          <p className="mt-3 text-3xl font-extrabold">{formatMoney(intelligence.summary.collected30Days)}</p>
          <p className="mt-2 text-xs text-muted-foreground">مقارنة مباشرة مع التعرض المتأخر.</p>
        </Card>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[.9fr_1.1fr]">
        <Card>
          <CardTitle>تنبيهات تنفيذية</CardTitle>
          <div className="mt-4 grid gap-3">
            {intelligence.executiveAlerts.map((alert) => (
              <div key={alert} className="rounded-md border border-border bg-muted/40 p-3 text-sm font-bold leading-7">
                {alert}
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <CardTitle>توزيع أعمار الديون</CardTitle>
          <div className="mt-4 grid gap-3">
            {aging.map(([label, value]) => {
              const max = Math.max(intelligence.summary.overdueReceivables, 1);
              const width = `${Math.min(100, Math.round((Number(value) / max) * 100))}%`;
              return (
                <div key={String(label)}>
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="font-bold">{label}</span>
                    <span className="text-muted-foreground">{formatMoney(Number(value))}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded bg-muted">
                    <div className="h-full rounded bg-primary" style={{ width }} />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </section>

      <Card className="mt-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle>قائمة العمل ذات الأولوية</CardTitle>
            <p className="mt-2 text-sm text-muted-foreground">ابدأ من أعلى القائمة: هذه الحسابات تجمع بين أعلى خطر وأعلى أثر مالي.</p>
          </div>
          <Badge tone="info">{intelligence.queue.length} بند للمتابعة</Badge>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[1100px] text-sm">
            <thead className="text-muted-foreground">
              <tr className="border-b border-border text-right">
                <th className="py-3">العميل</th>
                <th>الفاتورة</th>
                <th>المبلغ</th>
                <th>التأخير</th>
                <th>الخطر</th>
                <th>الأولوية</th>
                <th>القناة</th>
                <th>الإجراء التالي</th>
                <th>المحصل</th>
                <th>فتح</th>
              </tr>
            </thead>
            <tbody>
              {intelligence.queue.map((item) => (
                <tr key={`${item.invoiceId}-${item.caseId ?? "no-case"}`} className="border-b border-border align-top">
                  <td className="py-3">
                    <p className="font-extrabold">{item.companyName}</p>
                    <p className="text-xs text-muted-foreground">{item.customerName}</p>
                  </td>
                  <td>
                    <p className="font-bold">{item.invoiceNumber}</p>
                    <p className="text-xs text-muted-foreground">{item.caseNumber ?? "لا توجد قضية نشطة"}</p>
                  </td>
                  <td className="font-extrabold">{formatMoney(item.amount)}</td>
                  <td>{item.overdueDays} يوم</td>
                  <td>
                    <div className="flex flex-col gap-1">
                      <Badge tone={riskTone[item.riskBand]}>{item.riskBand}</Badge>
                      <span className="text-xs text-muted-foreground">درجة {item.riskScore}/100</span>
                    </div>
                  </td>
                  <td><Badge tone={item.priority === "CRITICAL" ? "danger" : item.priority === "HIGH" ? "warning" : "info"}>{priorityLabels[item.priority]}</Badge></td>
                  <td>
                    <p className="font-bold">{item.recommendedChannel}</p>
                    <p className="text-xs text-muted-foreground">{item.dunningStage}</p>
                  </td>
                  <td className="max-w-[260px] leading-7">{item.nextBestAction}</td>
                  <td>{item.collectorName}</td>
                  <td>
                    <div className="flex gap-2">
                      <Link className="rounded-md border border-border px-3 py-1.5 font-bold" href={`/customers/${item.customerId}`}>عميل</Link>
                      <Link className="rounded-md border border-border px-3 py-1.5 font-bold" href={`/invoices/${item.invoiceId}`}>فاتورة</Link>
                      {item.caseId ? <Link className="rounded-md border border-border px-3 py-1.5 font-bold" href={`/cases/${item.caseId}`}>قضية</Link> : null}
                    </div>
                  </td>
                </tr>
              ))}
              {intelligence.queue.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-10 text-center text-muted-foreground">لا توجد بنود تحصيل مفتوحة حاليًا.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
