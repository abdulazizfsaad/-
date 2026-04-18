import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardTitle } from "@/components/ui/card";
import { requireAuth } from "@/lib/auth";
import { getCollectionsIntelligence } from "@/lib/collections-intelligence";
import { getMessageTemplates } from "@/lib/message-templates";
import { formatMoney } from "@/lib/utils";

export default async function CollectionCampaignsPage() {
  const session = await requireAuth();
  const [intelligence, templates] = await Promise.all([
    getCollectionsIntelligence(session),
    getMessageTemplates(session)
  ]);
  const campaigns = [
    { key: "beforeDue", title: "حملة التذكير الوقائي", filter: (days: number) => days === 0, template: templates.beforeDue.body },
    { key: "overdue", title: "حملة المتأخر 1-30 يوم", filter: (days: number) => days > 0 && days <= 30, template: templates.overdue.body },
    { key: "followUp", title: "حملة المتأخر 31-60 يوم", filter: (days: number) => days > 30 && days <= 60, template: templates.followUp.body },
    { key: "finalNotice", title: "حملة التصعيد فوق 60 يوم", filter: (days: number) => days > 60, template: templates.finalNotice.body }
  ];

  return (
    <>
      <PageHeader
        title="حملات التحصيل"
        description="تقسيم العملاء تلقائيًا حسب عمر الدين مع نصوص جاهزة وقنوات مقترحة لتسريع التحصيل."
        action={<Link href="/settings/templates" className="rounded-md bg-primary px-4 py-2 text-sm font-extrabold text-white">تعديل القوالب</Link>}
      />
      <section className="grid gap-4 xl:grid-cols-2">
        {campaigns.map((campaign) => {
          const targets = intelligence.queue.filter((item) => campaign.filter(item.overdueDays));
          const amount = targets.reduce((sum, item) => sum + item.amount, 0);
          return (
            <Card key={campaign.key}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <CardTitle>{campaign.title}</CardTitle>
                  <p className="mt-2 text-sm text-muted-foreground">{targets.length} عميل مستهدف - {formatMoney(amount)}</p>
                </div>
                <Badge tone={targets.length ? "warning" : "success"}>{targets.length ? "جاهزة للتنفيذ" : "لا يوجد مستهدفون"}</Badge>
              </div>
              <div className="mt-4 rounded-md bg-muted p-3 text-sm leading-7">{campaign.template}</div>
              <div className="mt-4 grid gap-2">
                {targets.slice(0, 5).map((target) => (
                  <Link key={target.invoiceId} href={`/customers/${target.customerId}`} className="flex items-center justify-between rounded-md border border-border p-3 text-sm hover:border-primary">
                    <span className="font-bold">{target.companyName}</span>
                    <span className="text-muted-foreground">{formatMoney(target.amount)} - {target.recommendedChannel}</span>
                  </Link>
                ))}
              </div>
            </Card>
          );
        })}
      </section>
    </>
  );
}
