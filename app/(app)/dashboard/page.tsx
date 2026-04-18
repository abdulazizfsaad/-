import Link from "next/link";
import { AgingChart, CollectionsChart } from "@/components/charts";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardTitle } from "@/components/ui/card";
import { requireAuth } from "@/lib/auth";
import { getCollectionsIntelligence } from "@/lib/collections-intelligence";
import { getDashboardData } from "@/lib/data";
import { caseStageLabels } from "@/lib/labels";
import { formatDate, formatMoney } from "@/lib/utils";

export default async function DashboardPage() {
  const session = await requireAuth();
  const [data, intelligence] = await Promise.all([
    getDashboardData(session),
    getCollectionsIntelligence(session)
  ]);
  const cards = [
    ["إجمالي الذمم", formatMoney(data.kpis.totalReceivables), "كل الفواتير المفتوحة"],
    ["الذمم المتأخرة", formatMoney(data.kpis.overdueReceivables), "بعد تاريخ الاستحقاق"],
    ["المحصل هذا الشهر", formatMoney(data.kpis.collectedThisMonth), "مدفوعات مسجلة"],
    ["نسبة التحصيل", `${data.kpis.collectionRate}%`, "من إجمالي الفواتير"],
    ["عملاء نشطون", data.kpis.activeCustomers, "ضمن الشركة"],
    ["عملاء متأخرون", data.kpis.overdueCustomers, "لديهم أرصدة مستحقة"],
    ["حالات نشطة", data.kpis.activeCases, "قيد المتابعة"],
    ["وعود فائتة", data.kpis.missedPromises, "تحتاج إجراء سريع"],
    ["SMS هذا الشهر", data.kpis.smsMessages, "رسائل مسجلة"],
    ["واتساب هذا الشهر", data.kpis.whatsappMessages, "رسائل مسجلة"]
  ];

  return (
    <>
      <PageHeader
        title="لوحة المؤشرات"
        description="نظرة تنفيذية على الذمم المدينة، التحصيل، المخاطر، وأداء الفريق."
        action={<Link href="/collections/workbench" className="rounded-md bg-primary px-4 py-2 text-sm font-extrabold text-white">فتح مركز التحصيل الذكي</Link>}
      />
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {cards.map(([label, value, note]) => (
          <Card key={String(label)}>
            <p className="text-sm font-bold text-muted-foreground">{label}</p>
            <p className="mt-3 text-3xl font-extrabold">{value}</p>
            <p className="mt-2 text-xs text-muted-foreground">{note}</p>
          </Card>
        ))}
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[.9fr_1.1fr]">
        <Card className="bg-slate-950 text-white">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-white/70">محرك المخاطر والتحصيل</p>
              <p className="mt-3 text-5xl font-extrabold">{intelligence.summary.healthScore}%</p>
              <p className="mt-2 text-sm text-white/70">مؤشر صحة التحصيل بناءً على العمر، المخاطر، الوعود، والنزاعات.</p>
            </div>
            <Badge tone={intelligence.summary.healthScore >= 75 ? "success" : intelligence.summary.healthScore >= 50 ? "warning" : "danger"}>
              {intelligence.summary.healthScore >= 75 ? "مستقر" : intelligence.summary.healthScore >= 50 ? "يحتاج متابعة" : "حرج"}
            </Badge>
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <div className="rounded-md border border-white/15 p-3">
              <p className="text-xs text-white/60">تعرض حرج</p>
              <p className="mt-2 text-lg font-extrabold">{formatMoney(intelligence.summary.criticalExposure)}</p>
            </div>
            <div className="rounded-md border border-white/15 p-3">
              <p className="text-xs text-white/60">وعود مكسورة</p>
              <p className="mt-2 text-lg font-extrabold">{intelligence.summary.brokenPromises}</p>
            </div>
            <div className="rounded-md border border-white/15 p-3">
              <p className="text-xs text-white/60">نزاعات مفتوحة</p>
              <p className="mt-2 text-lg font-extrabold">{intelligence.summary.disputes}</p>
            </div>
          </div>
        </Card>
        <Card>
          <CardTitle>أهم إنذارات اليوم</CardTitle>
          <div className="mt-4 grid gap-3">
            {intelligence.executiveAlerts.slice(0, 4).map((alert) => (
              <div key={alert} className="rounded-md border border-border bg-muted/40 p-3 text-sm font-bold leading-7">
                {alert}
              </div>
            ))}
          </div>
        </Card>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-2">
        <Card>
          <CardTitle>تقرير أعمار الديون</CardTitle>
          <AgingChart data={data.aging} />
        </Card>
        <Card>
          <CardTitle>التحصيل مقابل الهدف</CardTitle>
          <CollectionsChart data={data.trend} />
        </Card>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[1.2fr_.8fr]">
        <Card>
          <CardTitle>أحدث حالات التحصيل</CardTitle>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="text-muted-foreground">
                <tr className="border-b border-border text-right">
                  <th className="py-3">رقم الحالة</th>
                  <th>العميل</th>
                  <th>المرحلة</th>
                  <th>المبلغ</th>
                  <th>المتابعة القادمة</th>
                </tr>
              </thead>
              <tbody>
                {data.recentCases.map((item) => (
                  <tr key={item.id} className="border-b border-border">
                    <td className="py-3 font-bold">{item.caseNumber}</td>
                    <td>{item.customer.companyName}</td>
                    <td><Badge tone="info">{caseStageLabels[item.stage]}</Badge></td>
                    <td>{formatMoney(item.outstandingAmount.toString())}</td>
                    <td>{formatDate(item.nextFollowUpDate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
        <Card>
          <CardTitle>أعلى الحسابات أولوية</CardTitle>
          <div className="mt-4 grid gap-3">
            {intelligence.queue.slice(0, 5).map((item) => (
              <Link key={item.invoiceId} href={item.caseId ? `/cases/${item.caseId}` : `/invoices/${item.invoiceId}`} className="rounded-md border border-border p-3 hover:bg-muted/50">
                <div className="flex justify-between gap-3">
                  <p className="font-extrabold">{item.companyName}</p>
                  <Badge tone={item.riskBand === "حرج" ? "danger" : item.riskBand === "مرتفع" ? "warning" : "info"}>{item.riskBand}</Badge>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{formatMoney(item.amount)} - {item.overdueDays} يوم تأخير</p>
                <p className="mt-2 text-xs font-bold text-primary">{item.nextBestAction}</p>
              </Link>
            ))}
          </div>
        </Card>
      </section>
    </>
  );
}
