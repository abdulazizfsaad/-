import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardTitle } from "@/components/ui/card";
import { requireAuth } from "@/lib/auth";
import { getReports } from "@/lib/data";
import { formatMoney } from "@/lib/utils";

export default async function ReportsPage() {
  const session = await requireAuth();
  const { reports, invoices, cases, promises, payments } = await getReports(session);
  const overdue = invoices.filter((invoice) => invoice.dueDate < new Date() && Number(invoice.remainingAmount) > 0);
  const reportCards = [
    ["/reports/executive", "التقرير التنفيذي للتحصيل", "جاهز للإدارة", "مؤشر الصحة، المخاطر، وقرارات اليوم"],
    ["/reports/aging", "تقرير أعمار الديون", `${overdue.length} فاتورة`, formatMoney(overdue.reduce((s, i) => s + Number(i.remainingAmount), 0))],
    ["/reports/customers", "العملاء المتأخرون", `${new Set(overdue.map((i) => i.customerId)).size} عميل`, "قابل للتصدير"],
    ["/reports/collections", "أداء التحصيل", `${cases.length} حالة`, "حسب المحصل والمرحلة"],
    ["/reports/promises", "وعود السداد", `${promises.length} وعد`, "ملتزم / متعثر"],
    ["/reports/collectors", "نشاط المحصلين", `${cases.filter((c) => c.assignedCollectorId).length} حالة مسندة`, "متابعة الفريق"],
    ["/reports/messages", "تقرير الرسائل", "SMS / WhatsApp", "سجل القنوات والحالات"]
  ];

  return (
    <>
      <PageHeader title="التقارير" description="تقارير تشغيلية وتنفيذية للذمم، التحصيل، الوعود، نشاط المحصلين، والرسائل." />
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {reportCards.map(([href, title, value, note]) => (
          <Link key={href} href={href} className="block">
            <Card className="h-full hover:border-primary">
              <Badge tone="info">جاهز</Badge>
              <h2 className="mt-4 text-xl font-extrabold">{title}</h2>
              <p className="mt-3 text-2xl font-extrabold">{value}</p>
              <p className="mt-2 text-sm text-muted-foreground">{note}</p>
            </Card>
          </Link>
        ))}
      </section>
      <Card className="mt-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle>ملخص التحصيل الشهري</CardTitle>
          <Badge tone="success">{formatMoney(payments.reduce((s, p) => s + Number(p.amount), 0))}</Badge>
        </div>
      </Card>
      <Card className="mt-6">
        <CardTitle>تعريفات التقارير المحفوظة</CardTitle>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {reports.map((report) => (
            <div key={report.id} className="rounded-md border border-border p-3">
              <p className="font-extrabold">{report.title}</p>
              <p className="mt-2 text-sm text-muted-foreground">{report.description}</p>
            </div>
          ))}
        </div>
      </Card>
    </>
  );
}
