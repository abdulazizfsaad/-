import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardTitle } from "@/components/ui/card";
import { requireAuth } from "@/lib/auth";
import { getCollectionsIntelligence, getCollectorPerformance } from "@/lib/collections-intelligence";
import { formatMoney } from "@/lib/utils";

export default async function ExecutiveReportPage() {
  const session = await requireAuth();
  const [intelligence, collectors] = await Promise.all([
    getCollectionsIntelligence(session),
    getCollectorPerformance(session)
  ]);

  return (
    <>
      <PageHeader
        title="التقرير التنفيذي للتحصيل"
        description="ملخص مجلس الإدارة والإدارة المالية: صحة التحصيل، التعرض الحرج، أداء المحصلين، ومناطق الخطر التي تحتاج قرارًا."
        action={<Link href="/collections/workbench" className="rounded-md bg-primary px-4 py-2 text-sm font-extrabold text-white">مركز التحصيل</Link>}
      />
      <section className="grid gap-4 md:grid-cols-4">
        <Card className="bg-slate-950 text-white"><p className="text-sm text-white/70">صحة التحصيل</p><p className="mt-2 text-4xl font-extrabold">{intelligence.summary.healthScore}%</p></Card>
        <Card><p className="text-sm text-muted-foreground">إجمالي المتأخر</p><p className="mt-2 text-3xl font-extrabold">{formatMoney(intelligence.summary.overdueReceivables)}</p></Card>
        <Card><p className="text-sm text-muted-foreground">تعرض حرج</p><p className="mt-2 text-3xl font-extrabold">{formatMoney(intelligence.summary.criticalExposure)}</p></Card>
        <Card><p className="text-sm text-muted-foreground">حالات نشطة</p><p className="mt-2 text-3xl font-extrabold">{intelligence.summary.activeCases}</p></Card>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[.8fr_1.2fr]">
        <Card>
          <CardTitle>قرارات مطلوبة</CardTitle>
          <div className="mt-4 grid gap-3">
            {intelligence.executiveAlerts.map((alert) => (
              <div key={alert} className="rounded-md border border-border bg-muted/40 p-3 text-sm font-bold leading-7">{alert}</div>
            ))}
          </div>
        </Card>
        <Card>
          <CardTitle>أداء المحصلين مقابل الهدف</CardTitle>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="text-muted-foreground">
                <tr className="border-b border-border text-right">
                  <th className="py-3">المحصل</th>
                  <th>المحصل هذا الشهر</th>
                  <th>الهدف</th>
                  <th>الإنجاز</th>
                  <th>الحالات النشطة</th>
                  <th>التقييم</th>
                </tr>
              </thead>
              <tbody>
                {collectors.map((collector) => (
                  <tr key={collector.id} className="border-b border-border">
                    <td className="py-3 font-extrabold">{collector.name}</td>
                    <td>{formatMoney(collector.collectedThisMonth)}</td>
                    <td>{formatMoney(collector.target)}</td>
                    <td>{collector.achievement}%</td>
                    <td>{collector.activeCases}</td>
                    <td>
                      <Badge tone={collector.achievement >= 80 ? "success" : collector.needsCoaching ? "warning" : "info"}>
                        {collector.achievement >= 80 ? "ممتاز" : collector.needsCoaching ? "يحتاج دعم" : "قيد المتابعة"}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </section>
    </>
  );
}
