import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { requireAuth } from "@/lib/auth";
import { getSmsData } from "@/lib/data";
import { messageStatusLabels } from "@/lib/labels";
import { formatDate } from "@/lib/utils";

export default async function SmsMessagesPage() {
  const session = await requireAuth();
  const { messages } = await getSmsData(session);
  return <><PageHeader title="سجل رسائل SMS" description="كل الرسائل المرسلة أو التجريبية من العملاء والقضايا والفواتير." /><Card className="overflow-x-auto"><table className="w-full min-w-[900px] text-sm"><thead className="text-muted-foreground"><tr className="border-b text-right"><th className="py-3">المستلم</th><th>العميل</th><th>الحالة</th><th>المرسل</th><th>التاريخ</th><th>النص</th></tr></thead><tbody>{messages.map((m) => <tr key={m.id} className="border-b"><td className="py-3 font-bold">{m.recipientPhone}</td><td>{m.customer?.companyName ?? "-"}</td><td><Badge>{messageStatusLabels[m.status]}</Badge></td><td>{m.sentBy?.name ?? "-"}</td><td>{formatDate(m.createdAt)}</td><td>{m.messageBody}</td></tr>)}</tbody></table></Card></>;
}
