import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardTitle } from "@/components/ui/card";
import { requireAuth } from "@/lib/auth";
import { getFinancialHealth } from "@/lib/financial-insights";
import { riskLevelLabels } from "@/lib/labels";
import { formatMoney } from "@/lib/utils";

export default async function FinancialHealthReportPage() {
  const session = await requireAuth();
  const health = await getFinancialHealth(session);
  const kpis = [
    ["إجمالي الذمم", formatMoney(health.kpis.totalReceivables), "الرصيد المفتوح"],
    ["نسبة المتأخر", `${health.kpis.overdueRatio}%`, "من إجمالي الذمم"],
    ["DSO", `${health.kpis.dso} يوم`, "متوسط أيام التحصيل"],
    ["CEI", `${health.kpis.collectionEffectiveness}%`, "فعالية التحصيل آخر 90 يوم"],
    ["كسر الوعود", `${health.kpis.promiseBreakRate}%`, "وعود غير ملتزم بها"],
    ["توقع نقدي 30 يوم", formatMoney(health.kpis.cashForecast30), "وعود سداد قادمة"]
  ];

  return (
    <>
      <PageHeader
        title="تقرير الصحة المالية"
        description="قراءة CFO للذمم المدينة: DSO، فعالية التحصيل، تركيز المخاطر، الوعود، والتعرض عالي المخاطر."
        action={<button className="rounded-md border border-border px-4 py-2 text-sm font-extrabold print:hidden">جاهز للطباعة</button>}
      />
      <section className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
        {kpis.map(([label, value, note]) => (
          <Card key={label}>
            <p className="text-sm font-bold text-muted-foreground">{label}</p>
            <p className="mt-3 text-2xl font-extrabold">{value}</p>
            <p className="mt-2 text-xs text-muted-foreground">{note}</p>
          </Card>
        ))}
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[.85fr_1.15fr]">
        <Card className="bg-slate-950 text-white">
          <CardTitle className="text-white">قرارات مالية مقترحة</CardTitle>
          <div className="mt-4 grid gap-3">
            {health.recommendations.map((item) => (
              <div key={item} className="rounded-md border border-white/15 p-3 text-sm font-bold leading-7 text-white/80">{item}</div>
            ))}
          </div>
        </Card>
        <Card>
          <CardTitle>أعلى تعرض ائتماني</CardTitle>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[820px] text-sm">
              <thead className="text-muted-foreground">
                <tr className="border-b border-border text-right">
                  <th className="py-3">العميل</th><th>الرصيد</th><th>المتأخر</th><th>حد الائتمان</th><th>الاستخدام</th><th>المخاطر</th><th>فتح</th>
                </tr>
              </thead>
              <tbody>
                {health.topExposures.map((customer) => (
                  <tr key={customer.id} className="border-b border-border">
                    <td className="py-3 font-extrabold">{customer.companyName}</td>
                    <td>{formatMoney(customer.outstanding)}</td>
                    <td>{formatMoney(customer.overdue)}</td>
                    <td>{formatMoney(customer.creditLimit)}</td>
                    <td>{customer.utilization}%</td>
                    <td><Badge tone={customer.riskLevel === "CRITICAL" || customer.riskLevel === "HIGH" ? "danger" : "info"}>{riskLevelLabels[customer.riskLevel]}</Badge></td>
                    <td><Link className="font-bold text-primary" href={`/customers/${customer.id}`}>عرض</Link></td>
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
