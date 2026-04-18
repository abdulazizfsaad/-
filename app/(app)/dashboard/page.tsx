import { AgingChart, CollectionsChart } from "@/components/charts";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardTitle } from "@/components/ui/card";
import { requireAuth } from "@/lib/auth";
import { getDashboardData } from "@/lib/data";
import { caseStageLabels } from "@/lib/labels";
import { formatDate, formatMoney } from "@/lib/utils";

export default async function DashboardPage() {
  const session = await requireAuth();
  const data = await getDashboardData(session);
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
      <PageHeader title="لوحة المؤشرات" description="نظرة تنفيذية على الذمم المدينة، التحصيل، المخاطر، وأداء الفريق." />
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(([label, value, note]) => (
          <Card key={String(label)}>
            <p className="text-sm font-bold text-muted-foreground">{label}</p>
            <p className="mt-3 text-3xl font-extrabold">{value}</p>
            <p className="mt-2 text-xs text-muted-foreground">{note}</p>
          </Card>
        ))}
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
          <CardTitle>أفضل المحصلين</CardTitle>
          <div className="mt-4 grid gap-3">
            {data.topCollectors.map((collector) => (
              <div key={collector.name} className="rounded-md border border-border p-3">
                <div className="flex justify-between gap-3">
                  <p className="font-extrabold">{collector.name}</p>
                  <Badge tone="success">{formatMoney(collector.collected)}</Badge>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{collector.activeCases} حالة مسندة</p>
              </div>
            ))}
          </div>
        </Card>
      </section>
    </>
  );
}
