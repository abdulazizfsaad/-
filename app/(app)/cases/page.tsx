import Link from "next/link";
import { CaseStage } from "@prisma/client";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardTitle } from "@/components/ui/card";
import { requireAuth } from "@/lib/auth";
import { getCases } from "@/lib/data";
import { caseStageLabels, escalationLabels, priorityLabels } from "@/lib/labels";
import { formatDate, formatMoney } from "@/lib/utils";

const kanbanStages = [
  CaseStage.NEW,
  CaseStage.PENDING_FOLLOW_UP,
  CaseStage.CONTACTED,
  CaseStage.PROMISE_TO_PAY,
  CaseStage.NO_RESPONSE,
  CaseStage.DISPUTED,
  CaseStage.ESCALATED,
  CaseStage.CLOSED_PAID
];

export default async function CasesPage() {
  const session = await requireAuth();
  const cases = await getCases(session);
  const activeCases = cases.filter((item) => item.stage !== CaseStage.CLOSED_PAID && item.stage !== CaseStage.CLOSED_UNCOLLECTIBLE);
  const overdueFollowUps = activeCases.filter((item) => item.nextFollowUpDate && item.nextFollowUpDate < new Date());
  const disputed = activeCases.filter((item) => item.disputeFlag);

  return (
    <>
      <PageHeader
        title="قضايا التحصيل"
        description="إدارة دورة المتابعة من الحالة الجديدة حتى السداد، التصعيد، أو الإغلاق مع رؤية Kanban يومية للفريق."
        action={<Link href="/cases/new" className="rounded-md bg-primary px-4 py-2 text-sm font-bold text-white">إضافة قضية</Link>}
      />

      <section className="mb-6 grid gap-4 md:grid-cols-4">
        <Card><p className="text-sm text-muted-foreground">قضايا نشطة</p><p className="mt-2 text-3xl font-extrabold">{activeCases.length}</p></Card>
        <Card><p className="text-sm text-muted-foreground">متابعات فائتة</p><p className="mt-2 text-3xl font-extrabold">{overdueFollowUps.length}</p></Card>
        <Card><p className="text-sm text-muted-foreground">نزاعات مفتوحة</p><p className="mt-2 text-3xl font-extrabold">{disputed.length}</p></Card>
        <Card><p className="text-sm text-muted-foreground">إجمالي التعرض</p><p className="mt-2 text-3xl font-extrabold">{formatMoney(activeCases.reduce((sum, item) => sum + Number(item.outstandingAmount), 0))}</p></Card>
      </section>

      <Card>
        <CardTitle>لوحة Kanban للتحصيل</CardTitle>
        <div className="mt-4 grid gap-4 overflow-x-auto xl:grid-cols-4 2xl:grid-cols-8">
          {kanbanStages.map((stage) => {
            const stageCases = cases.filter((item) => item.stage === stage);
            return (
              <div key={stage} className="min-w-[240px] rounded-lg border border-border bg-muted/30 p-3">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <h2 className="font-extrabold">{caseStageLabels[stage]}</h2>
                  <Badge tone="info">{stageCases.length}</Badge>
                </div>
                <div className="grid gap-3">
                  {stageCases.slice(0, 8).map((item) => (
                    <Link key={item.id} href={`/cases/${item.id}`} className="rounded-md border border-border bg-white p-3 hover:border-primary">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-extrabold text-primary">{item.caseNumber}</p>
                        <Badge tone={item.priority === "CRITICAL" ? "danger" : item.priority === "HIGH" ? "warning" : "default"}>{priorityLabels[item.priority]}</Badge>
                      </div>
                      <p className="mt-2 text-sm font-bold">{item.customer.companyName}</p>
                      <p className="mt-2 text-xs text-muted-foreground">{formatMoney(item.outstandingAmount.toString())}</p>
                      <p className="mt-1 text-xs text-muted-foreground">المتابعة: {formatDate(item.nextFollowUpDate)}</p>
                    </Link>
                  ))}
                  {stageCases.length === 0 ? <p className="rounded-md border border-dashed border-border p-3 text-center text-xs text-muted-foreground">لا توجد قضايا</p> : null}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <div className="mt-6 grid gap-4 xl:grid-cols-2">
        {cases.map((item) => (
          <Card key={item.id}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs text-muted-foreground">معرف الحالة</p>
                <h2 className="text-xl font-extrabold"><Link className="text-primary" href={`/cases/${item.id}`}>{item.caseNumber}</Link></h2>
              </div>
              <div className="flex gap-2">
                <Badge tone={item.priority === "CRITICAL" || item.priority === "HIGH" ? "danger" : "warning"}>{priorityLabels[item.priority]}</Badge>
                <Badge tone="info">{caseStageLabels[item.stage]}</Badge>
              </div>
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
