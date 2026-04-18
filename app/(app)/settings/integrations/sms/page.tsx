import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardTitle } from "@/components/ui/card";
import { requireAuth } from "@/lib/auth";
import { getSmsData } from "@/lib/data";
import { saveSmsProviderSettings } from "@/lib/server-actions";

export default async function SmsIntegrationPage() {
  const session = await requireAuth();
  const { providers } = await getSmsData(session);
  const active = providers.find((provider) => provider.isActive) ?? providers[0];
  const supported = [
    ["twilio", "Twilio"],
    ["unifonic", "Unifonic"],
    ["taqnyat", "Taqnyat"],
    ["msegat", "Msegat"],
    ["4jawaly", "4jawaly"],
    ["generic", "Generic HTTP API"]
  ];
  const demo = !process.env.SMS_API_KEY;
  return (
    <>
      <PageHeader title="تكامل رسائل SMS" description="تفعيل مزود الرسائل واسم المرسل. المفاتيح لا تظهر في الواجهة وتقرأ من متغيرات البيئة فقط." />
      <section className="grid gap-6 xl:grid-cols-[.8fr_1.2fr]">
        <Card>
          <CardTitle>حالة التكامل</CardTitle>
          <p className="mt-4"><Badge tone={demo ? "warning" : "success"}>{demo ? "وضع تجريبي" : "جاهز للإرسال الحقيقي"}</Badge></p>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">استخدم SMS_API_KEY وSMS_BASE_URL وSMS_SENDER_NAME في ملف البيئة. عند غياب المفتاح يسجل النظام الرسائل بوضع Demo داخل قاعدة البيانات.</p>
        </Card>
        <Card>
          <CardTitle>إعداد المزود</CardTitle>
          <form action={saveSmsProviderSettings} className="mt-4 grid gap-3 md:grid-cols-2">
            <label className="grid gap-1 text-sm font-bold">المزود<select name="providerCode" defaultValue={active?.providerCode ?? "generic"} className="rounded-md border border-border px-3 py-2 font-normal">{supported.map(([code, name]) => <option key={code} value={code}>{name}</option>)}</select></label>
            <label className="grid gap-1 text-sm font-bold">اسم المزود<input name="providerName" defaultValue={active?.providerName ?? "Generic HTTP API"} className="rounded-md border border-border px-3 py-2 font-normal" /></label>
            <label className="grid gap-1 text-sm font-bold">اسم المرسل<input name="senderName" defaultValue={active?.senderName ?? process.env.SMS_SENDER_NAME ?? "THIMAR"} className="rounded-md border border-border px-3 py-2 font-normal" /></label>
            <label className="grid gap-1 text-sm font-bold">Base URL<input name="apiBaseUrl" defaultValue={active?.apiBaseUrl ?? process.env.SMS_BASE_URL ?? ""} className="rounded-md border border-border px-3 py-2 font-normal" /></label>
            <label className="flex items-center gap-2 text-sm font-bold"><input name="isActive" type="checkbox" defaultChecked={active?.isActive ?? true} /> تفعيل هذا المزود</label>
            <div className="flex items-end"><button className="w-full rounded-md bg-primary px-4 py-2 text-sm font-extrabold text-white">حفظ إعدادات SMS</button></div>
          </form>
          <div className="mt-5 grid gap-3">
            {providers.map((provider) => <div key={provider.id} className="rounded-md bg-muted p-3"><p className="font-bold">{provider.providerName}</p><p className="text-sm text-muted-foreground">{provider.senderName} | {provider.apiBaseUrl ?? "بدون رابط"} | {provider.isActive ? "نشط" : "غير نشط"}</p></div>)}
          </div>
        </Card>
      </section>
    </>
  );
}
