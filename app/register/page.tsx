import { prisma } from "@/lib/prisma";
import { registerTenant } from "@/lib/server-actions";

export default async function RegisterPage() {
  const plans = await prisma.subscriptionPlan.findMany({ where: { status: "ACTIVE" }, orderBy: { monthlyPrice: "asc" } });
  return (
    <main className="min-h-screen bg-background px-4 py-10" dir="rtl">
      <section className="mx-auto max-w-5xl rounded-lg border border-border bg-white p-8 shadow-soft">
        <p className="text-sm font-bold text-primary">إنشاء حساب شركة</p>
        <h1 className="mt-2 text-3xl font-extrabold">ابدأ تجربة منصة ثمار للتحصيل</h1>
        <form action={registerTenant} className="mt-8 grid gap-4 md:grid-cols-2">
          <input name="companyName" required className="rounded-md border border-border px-3 py-2" placeholder="اسم الشركة" />
          <input name="commercialRegistrationNumber" className="rounded-md border border-border px-3 py-2" placeholder="رقم السجل التجاري" />
          <input name="vatNumber" className="rounded-md border border-border px-3 py-2" placeholder="الرقم الضريبي" />
          <input name="city" className="rounded-md border border-border px-3 py-2" placeholder="المدينة" />
          <input name="phone" className="rounded-md border border-border px-3 py-2" placeholder="الهاتف" />
          <input name="companyEmail" type="email" required className="rounded-md border border-border px-3 py-2" placeholder="بريد الشركة" />
          <input name="adminName" required className="rounded-md border border-border px-3 py-2" placeholder="اسم مدير الحساب" />
          <input name="adminEmail" type="email" required className="rounded-md border border-border px-3 py-2" placeholder="بريد مدير الحساب" />
          <input name="adminPassword" type="password" required className="rounded-md border border-border px-3 py-2" placeholder="كلمة المرور" />
          <select name="plan" className="rounded-md border border-border px-3 py-2">
            {plans.map((plan) => <option key={plan.id} value={plan.code}>{plan.name} - {Number(plan.monthlyPrice).toLocaleString("ar-SA")} ر.س شهرياً</option>)}
          </select>
          <label className="md:col-span-2 flex gap-2 text-sm"><input name="terms" type="checkbox" required /> أوافق على الشروط وسياسة الاستخدام</label>
          <button className="md:col-span-2 rounded-md bg-primary px-4 py-3 font-bold text-white">إنشاء الحساب التجريبي</button>
        </form>
      </section>
    </main>
  );
}
