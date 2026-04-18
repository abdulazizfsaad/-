import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { requireAuth } from "@/lib/auth";
import { getCases } from "@/lib/data";
import { caseStageLabels, escalationLabels, priorityLabels } from "@/lib/labels";
import { formatDate, formatMoney } from "@/lib/utils";

export default async function CasesPage() {
  const session = await requireAuth();
  const cases = await getCases(session);
  return (
    <>
      <PageHeader title="حالات التحصيل" description="إدارة دورة المتابعة من الحالة الجديدة حتى السداد أو التصعيد القانوني." action={<a href="/cases/new" className="rounded-md bg-primary px-4 py-2 text-sm font-bold text-white">إضافة قضية</a>} />
      <div className="grid gap-4 xl:grid-cols-2">
        {cases.map((item) => (
          <Card key={item.id}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div><p className="text-xs text-muted-foreground">معرف الحالة</p><h2 className="text-xl font-extrabold"><a className="text-primary" href={`/cases/${item.id}`}>{item.caseNumber}</a></h2></div>
              <div className="flex gap-2"><Badge tone={item.priority === "CRITICAL" || item.priority === "HIGH" ? "danger" : "warning"}>{priorityLabels[item.priority]}</Badge><Badge tone="info">{caseStageLabels[item.stage]}</Badge></div>
            </div>
            <div className="mt-4 grid gap-3 text-sm md:grid-cols-2">
              <p><span className="font-bold text-muted-foreground">العميل: </span>{item.customer.companyName}</p>
              <p><span className="font-bold text-muted-foreground">المحصل: </span>{item.assignedCollector?.name ?? "غير مسند"}</p>
              <p><span className="font-bold text-muted-foreground">المبلغ: </span>{formatMoney(item.outstandingAmount.toString())}</p>
              <p><span className="font-bold text-muted-foreground">المتابعة القادمة: </span>{formatDate(item.nextFollowUpDate)}</p>
              <p><span className="font-bold text-muted-foreground">تصعيد: </span>{escalationLabels[item.escalationStatus]}</p>
              <p><span className="font-bold text-muted-foreground">نزاع: </span>{item.disputeFlag ? "نعم" : "لا"}</p>
            </div>
            <p className="mt-4 rounded-md bg-muted p-3 text-sm leading-7">{item.notes ?? "لا توجد ملاحظات"}</p>
          </Card>
        ))}
      </div>
    </>
  );
}
