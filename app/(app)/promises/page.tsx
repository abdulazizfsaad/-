import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { requireAuth } from "@/lib/auth";
import { getPromises } from "@/lib/data";
import { promiseStatusLabels } from "@/lib/labels";
import { formatDate, formatMoney } from "@/lib/utils";

export default async function PromisesPage() {
  const session = await requireAuth();
  const promises = await getPromises(session);
  const now = new Date();
  return (
    <>
      <PageHeader title="وعود السداد" description="متابعة الالتزامات المستقبلية والتنبيه عند تجاوز تاريخ الوعد." />
      <div className="grid gap-4 lg:grid-cols-3">
        {promises.map((promise) => {
          const missed = promise.status === "PENDING" && promise.promiseDate < now;
          return (
            <Card key={promise.id} className={missed ? "border-rose-200" : ""}>
              <div className="flex justify-between gap-3"><p className="text-sm font-bold text-muted-foreground">{promise.customer.companyName}</p><Badge tone={missed ? "danger" : promise.status === "KEPT" ? "success" : "warning"}>{missed ? "متأخر" : promiseStatusLabels[promise.status]}</Badge></div>
              <p className="mt-4 text-2xl font-extrabold">{formatMoney(promise.promisedAmount.toString())}</p>
              <p className="mt-3 text-sm text-muted-foreground">تاريخ الوعد: {formatDate(promise.promiseDate)}</p>
              <p className="mt-1 text-sm text-muted-foreground">التزم به: {promise.committedBy}</p>
              <p className="mt-3 rounded-md bg-muted p-3 text-sm">{promise.notes ?? "بدون ملاحظات"}</p>
            </Card>
          );
        })}
      </div>
    </>
  );
}
