import { UserRole } from "@prisma/client";
import { PageHeader } from "@/components/page-header";
import { Card, CardTitle } from "@/components/ui/card";
import { requireAuth } from "@/lib/auth";
import { getSettings } from "@/lib/data";
import { saveCreditPolicy } from "@/lib/server-actions";

type CreditPolicy = {
  softReminderDays?: number;
  formalReminderDays?: number;
  managerEscalationDays?: number;
  legalEscalationDays?: number;
  creditHoldUtilization?: number;
  maxBrokenPromises?: number;
  requireManagerApprovalAbove?: number;
};

export default async function CreditPolicyPage() {
  const session = await requireAuth([UserRole.COMPANY_ADMIN, UserRole.COLLECTION_MANAGER]);
  const { settings } = await getSettings(session);
  const policy = (settings.find((item) => item.key === "credit_policy")?.value ?? {}) as CreditPolicy;
  return (
    <>
      <PageHeader title="سياسة الائتمان والتحصيل" description="قواعد تشغيلية قابلة للضبط تحدد متى يبدأ التذكير، التصعيد، إيقاف الائتمان، والموافقة الإدارية." />
      <section className="grid gap-6 xl:grid-cols-[.9fr_1.1fr]">
        <Card>
          <CardTitle>القواعد المالية</CardTitle>
          <form action={saveCreditPolicy} className="mt-4 grid gap-3">
            <label className="grid gap-1 text-sm font-bold">تذكير ودي بعد كم يوم<input name="softReminderDays" type="number" defaultValue={policy.softReminderDays ?? 3} className="rounded-md border border-border px-3 py-2 font-normal" /></label>
            <label className="grid gap-1 text-sm font-bold">مطالبة رسمية بعد كم يوم<input name="formalReminderDays" type="number" defaultValue={policy.formalReminderDays ?? 7} className="rounded-md border border-border px-3 py-2 font-normal" /></label>
            <label className="grid gap-1 text-sm font-bold">تصعيد لمدير التحصيل بعد كم يوم<input name="managerEscalationDays" type="number" defaultValue={policy.managerEscalationDays ?? 30} className="rounded-md border border-border px-3 py-2 font-normal" /></label>
            <label className="grid gap-1 text-sm font-bold">تصعيد قانوني بعد كم يوم<input name="legalEscalationDays" type="number" defaultValue={policy.legalEscalationDays ?? 90} className="rounded-md border border-border px-3 py-2 font-normal" /></label>
            <label className="grid gap-1 text-sm font-bold">إيقاف ائتمان عند استخدام %<input name="creditHoldUtilization" type="number" defaultValue={policy.creditHoldUtilization ?? 100} className="rounded-md border border-border px-3 py-2 font-normal" /></label>
            <label className="grid gap-1 text-sm font-bold">عدد الوعود المكسورة قبل التصعيد<input name="maxBrokenPromises" type="number" defaultValue={policy.maxBrokenPromises ?? 1} className="rounded-md border border-border px-3 py-2 font-normal" /></label>
            <label className="grid gap-1 text-sm font-bold">موافقة مدير فوق مبلغ<input name="requireManagerApprovalAbove" type="number" defaultValue={policy.requireManagerApprovalAbove ?? 100000} className="rounded-md border border-border px-3 py-2 font-normal" /></label>
            <button className="rounded-md bg-primary px-4 py-2 font-extrabold text-white">حفظ سياسة الائتمان</button>
          </form>
        </Card>
        <Card>
          <CardTitle>تفسير السياسة</CardTitle>
          <div className="mt-4 grid gap-3 text-sm leading-7 text-muted-foreground">
            <p>هذه الإعدادات تجعل المنصة قابلة للبيع للشركات المتوسطة والكبيرة لأنها تنقل التحصيل من اجتهاد فردي إلى سياسة مالية موحدة.</p>
            <p>تسويقيًا: يمكن إبراز هذه الصفحة كميزة “حوكمة الائتمان” لأنها تربط المالية، المبيعات، والتحصيل في ضوابط واحدة.</p>
            <p>تقنيًا: يتم حفظ السياسة في SystemSetting لكل شركة، مما يحافظ على العزل بين المستأجرين.</p>
          </div>
        </Card>
      </section>
    </>
  );
}
