import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { requireAuth } from "@/lib/auth";
import { getWhatsappData } from "@/lib/data";
import { messageStatusLabels } from "@/lib/labels";
import { formatDate } from "@/lib/utils";

export default async function WhatsappMessagesPage() {
  const session = await requireAuth();
  const { messages } = await getWhatsappData(session);
  return <><PageHeader title="سجل رسائل واتساب" description="رسائل واتساب التجريبية أو المرسلة عبر المزود المرتبط." /><Card className="overflow-x-auto"><table className="w-full min-w-[900px] text-sm"><thead className="text-muted-foreground"><tr className="border-b text-right"><th className="py-3">المستلم</th><th>العميل</th><th>الحساب</th><th>الحالة</th><th>المرسل</th><th>التاريخ</th><th>النص</th></tr></thead><tbody>{messages.map((m) => <tr key={m.id} className="border-b"><td className="py-3 font-bold">{m.recipientPhone}</td><td>{m.customer?.companyName ?? "-"}</td><td>{m.whatsappAccount?.name ?? "-"}</td><td><Badge>{messageStatusLabels[m.status]}</Badge></td><td>{m.sentBy?.name ?? "-"}</td><td>{formatDate(m.createdAt)}</td><td>{m.messageBody}</td></tr>)}</tbody></table></Card></>;
}
