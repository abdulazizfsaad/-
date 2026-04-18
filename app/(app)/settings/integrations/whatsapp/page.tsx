import { WhatsAppSessionStatus } from "@prisma/client";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardTitle } from "@/components/ui/card";
import { requireAuth } from "@/lib/auth";
import { getWhatsappData } from "@/lib/data";
import { whatsappSessionLabels } from "@/lib/labels";
import { saveWhatsAppAccountSettings } from "@/lib/server-actions";

export default async function WhatsappIntegrationPage() {
  const session = await requireAuth();
  const { accounts } = await getWhatsappData(session);
  const account = accounts[0];
  const liveReady = Boolean(process.env.WHATSAPP_ACCESS_TOKEN || process.env.WHATSAPP_QR_PROVIDER_TOKEN);
  return (
    <>
      <PageHeader title="تكامل واتساب و QR" description="إعداد WhatsApp Cloud API أو مزود جلسات QR بدون تشغيل أتمتة واتساب غير رسمية داخل التطبيق." />
      <section className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardTitle>حالة الاتصال</CardTitle>
          <p className="mt-4"><Badge tone={account?.sessionStatus === "CONNECTED" ? "success" : "warning"}>{account ? whatsappSessionLabels[account.sessionStatus] : "غير متصل"}</Badge></p>
          <div className="mt-6 grid h-56 place-items-center rounded-md border border-dashed border-border bg-muted text-center text-sm text-muted-foreground">
            {account?.qrCodeUrl ? <span>QR جاهز من المزود: {account.qrCodeUrl}</span> : <span>منطقة QR جاهزة للربط مع WATI أو 360dialog أو Ultramsg أو Evolution API أو مزود عام</span>}
          </div>
          <p className="mt-3 text-sm text-muted-foreground">{liveReady ? "يوجد مفتاح بيئة، التكامل جاهز للربط الحقيقي." : "لا توجد مفاتيح بيئة، سيتم استخدام وضع Demo."}</p>
        </Card>
        <Card>
          <CardTitle>إعداد حساب واتساب</CardTitle>
          <form action={saveWhatsAppAccountSettings} className="mt-4 grid gap-3">
            <input type="hidden" name="id" value={account?.id ?? ""} />
            <input name="name" defaultValue={account?.name ?? "حساب واتساب التحصيل"} className="rounded-md border border-border px-3 py-2" placeholder="اسم الحساب" />
            <input name="phoneNumber" defaultValue={account?.phoneNumber ?? ""} className="rounded-md border border-border px-3 py-2" placeholder="رقم واتساب" />
            <select name="provider" defaultValue={account?.provider ?? "qr-provider"} className="rounded-md border border-border px-3 py-2">
              <option value="cloud-api">WhatsApp Cloud API</option>
              <option value="qr-provider">QR Provider</option>
              <option value="wati">WATI</option>
              <option value="360dialog">360dialog</option>
              <option value="ultramsg">Ultramsg</option>
              <option value="evolution-api">Evolution API</option>
              <option value="generic">Generic Provider</option>
            </select>
            <select name="sessionStatus" defaultValue={account?.sessionStatus ?? WhatsAppSessionStatus.QR_PENDING} className="rounded-md border border-border px-3 py-2">
              {Object.values(WhatsAppSessionStatus).map((status) => <option key={status} value={status}>{whatsappSessionLabels[status]}</option>)}
            </select>
            <input name="qrCodeUrl" defaultValue={account?.qrCodeUrl ?? "/qr-demo.svg"} className="rounded-md border border-border px-3 py-2" placeholder="رابط QR من المزود" />
            <button className="rounded-md bg-primary px-4 py-2 font-extrabold text-white">حفظ إعدادات واتساب</button>
          </form>
        </Card>
      </section>
    </>
  );
}
