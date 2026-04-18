import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardTitle } from "@/components/ui/card";
import { requireAuth } from "@/lib/auth";
import { getWhatsappData } from "@/lib/data";
import { whatsappSessionLabels } from "@/lib/labels";

export default async function WhatsappIntegrationPage() {
  const session = await requireAuth();
  const { accounts } = await getWhatsappData(session);
  const account = accounts[0];
  return <><PageHeader title="تكامل واتساب و QR" description="دعم WhatsApp Cloud API أو مزود جلسات QR بدون تنفيذ أتمتة واتساب غير رسمية داخل التطبيق." /><section className="grid gap-6 xl:grid-cols-2"><Card><CardTitle>حالة الاتصال</CardTitle><p className="mt-4"><Badge tone={account?.sessionStatus === "CONNECTED" ? "success" : "warning"}>{account ? whatsappSessionLabels[account.sessionStatus] : "غير متصل"}</Badge></p><div className="mt-6 grid h-56 place-items-center rounded-md border border-dashed border-border bg-muted text-center text-sm text-muted-foreground">منطقة QR جاهزة للربط مع WATI أو 360dialog أو Ultramsg أو Evolution API أو مزود عام</div><div className="mt-4 flex flex-wrap gap-2"><button className="rounded-md bg-primary px-4 py-2 text-sm font-bold text-white">Generate QR</button><button className="rounded-md border border-border px-4 py-2 text-sm font-bold">Check connection status</button><button className="rounded-md border border-border px-4 py-2 text-sm font-bold">Disconnect</button></div></Card><Card><CardTitle>إعدادات آمنة</CardTitle><p className="mt-4 text-sm leading-7 text-muted-foreground">المفاتيح لا تظهر في الواجهة. استخدم WHATSAPP_ACCESS_TOKEN أو WHATSAPP_QR_PROVIDER_TOKEN ومتغيرات البيئة الأخرى. Webhook URL placeholder جاهز للربط لاحقاً.</p><div className="mt-4 grid gap-2 text-sm"><p>Cloud API: phone number ID, business account ID, access token</p><p>QR Provider: provider URL, provider token, session status</p></div></Card></section></>;
}
