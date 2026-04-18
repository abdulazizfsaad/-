import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardTitle } from "@/components/ui/card";
import { requireAuth } from "@/lib/auth";
import { getSmsData } from "@/lib/data";

export default async function SmsIntegrationPage() {
  const session = await requireAuth();
  const { providers } = await getSmsData(session);
  const supported = ["Twilio", "Unifonic", "Taqnyat", "Msegat", "4jawaly", "Generic HTTP API"];
  const demo = !process.env.SMS_API_KEY;
  return <><PageHeader title="تكامل رسائل SMS" description="إعداد مزود الرسائل، اسم المرسل، ونمط التشغيل التجريبي عند غياب المفاتيح." /><section className="grid gap-6 xl:grid-cols-[.8fr_1.2fr]"><Card><CardTitle>المزود الحالي</CardTitle><p className="mt-4"><Badge tone={demo ? "warning" : "success"}>{demo ? "وضع تجريبي" : "مفعل"}</Badge></p><p className="mt-3 text-sm text-muted-foreground">لا يتم عرض أو تخزين مفاتيح API في الواجهة. استخدم متغيرات البيئة SMS_API_KEY وSMS_BASE_URL.</p></Card><Card><CardTitle>المزودون المدعومون</CardTitle><div className="mt-4 grid gap-3 md:grid-cols-2">{supported.map((p) => <div key={p} className="rounded-md border border-border p-3 font-bold">{p}</div>)}</div><div className="mt-4 grid gap-3">{providers.map((p) => <div key={p.id} className="rounded-md bg-muted p-3"><p className="font-bold">{p.providerName}</p><p className="text-sm text-muted-foreground">{p.senderName} | {p.apiBaseUrl ?? "بدون رابط"}</p></div>)}</div></Card></section></>;
}
