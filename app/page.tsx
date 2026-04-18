import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowLeft, CheckCircle2, ShieldCheck, TrendingUp, UsersRound } from "lucide-react";
import { LoginForm } from "@/app/login/login-form";
import { prisma } from "@/lib/prisma";
import { registerTenantPublic } from "@/lib/server-actions";

export default async function HomePage() {
  const plans = await prisma.subscriptionPlan.findMany({ where: { status: "ACTIVE" }, orderBy: { monthlyPrice: "asc" } });
  const features: Array<{ title: string; body: string; Icon: LucideIcon }> = [
    { title: "رؤية فورية للذمم", body: "تابع إجمالي المستحقات والمتأخرات ونسب التحصيل من لوحة واحدة.", Icon: TrendingUp },
    { title: "تشغيل فريق التحصيل", body: "اسند القضايا، راقب المراحل، وسجل كل مكالمة ورسالة ومتابعة.", Icon: UsersRound },
    { title: "حوكمة وأمان", body: "عزل بيانات كل شركة، أدوار وصلاحيات، وسجل تدقيق للعمليات.", Icon: ShieldCheck }
  ];

  return (
    <main className="min-h-screen bg-[#f7faf9] text-[#16211f]" dir="rtl">
      <section className="relative min-h-[86vh] overflow-hidden bg-[#123f38]">
        <img
          src="https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=1800&q=80"
          alt="فريق مالي يراجع تقارير التحصيل"
          className="absolute inset-0 h-full w-full object-cover opacity-35"
        />
        <div className="absolute inset-0 bg-[#0b2f2a]/70" />
        <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-5 py-5">
          <div className="flex items-center gap-3">
            <div className="grid size-11 place-items-center rounded-lg bg-white text-xl font-extrabold text-primary">ث</div>
            <div className="text-white">
              <p className="text-lg font-extrabold">ثمار للتحصيل</p>
              <p className="text-xs text-white/75">شركة ثمار المتحدة لخدمات الأعمال</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a href="#login" className="rounded-md border border-white/35 px-4 py-2 text-sm font-bold text-white hover:bg-white/10">تسجيل الدخول</a>
            <a href="#register" className="rounded-md bg-white px-4 py-2 text-sm font-bold text-[#123f38]">إنشاء حساب</a>
          </div>
        </header>

        <div className="relative z-10 mx-auto grid max-w-7xl gap-10 px-5 pb-20 pt-14 lg:grid-cols-[1.1fr_.9fr] lg:items-center">
          <div className="max-w-3xl text-white">
            <p className="inline-flex rounded-md bg-white/12 px-3 py-2 text-sm font-bold text-white">منصة SaaS عربية لإدارة الذمم والتحصيل في السعودية والخليج</p>
            <h1 className="mt-7 text-4xl font-extrabold leading-tight md:text-6xl">
              سيطرة كاملة على الفواتير المتأخرة، وعود السداد، وأداء فريق التحصيل.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-9 text-white/82">
              ثمار للتحصيل تربط العملاء والفواتير والقضايا والمدفوعات والرسائل في منصة واحدة، مع عزل بيانات كل شركة وتقارير تنفيذية جاهزة للإدارة المالية.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href="#register" className="inline-flex items-center gap-2 rounded-md bg-white px-5 py-3 text-sm font-extrabold text-[#123f38]">
                ابدأ تجربة الشركة
                <ArrowLeft className="size-4" />
              </a>
              <a href="#login" className="rounded-md border border-white/35 px-5 py-3 text-sm font-extrabold text-white hover:bg-white/10">دخول العملاء الحاليين</a>
            </div>
          </div>
          <div className="relative rounded-lg border border-white/18 bg-white/10 p-4 backdrop-blur">
            <img
              src="https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=1200&q=80"
              alt="لوحة مؤشرات مالية"
              className="h-72 w-full rounded-md object-cover"
            />
            <div className="mt-4 grid grid-cols-3 gap-3 text-white">
              <div><p className="text-2xl font-extrabold">30+</p><p className="text-xs text-white/75">فاتورة تجريبية</p></div>
              <div><p className="text-2xl font-extrabold">15</p><p className="text-xs text-white/75">قضية تحصيل</p></div>
              <div><p className="text-2xl font-extrabold">SMS</p><p className="text-xs text-white/75">وواتساب جاهز</p></div>
            </div>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 z-10 overflow-hidden border-y border-white/15 bg-white/10 py-3 text-white">
          <div className="landing-marquee flex gap-8 whitespace-nowrap text-sm font-bold">
            <span>تحصيل أسرع</span><span>تقارير تنفيذية</span><span>متابعة المحصلين</span><span>وعود سداد</span><span>تكامل SMS</span><span>ربط واتساب QR</span><span>عزل بيانات الشركات</span>
            <span>تحصيل أسرع</span><span>تقارير تنفيذية</span><span>متابعة المحصلين</span><span>وعود سداد</span><span>تكامل SMS</span><span>ربط واتساب QR</span><span>عزل بيانات الشركات</span>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-5 py-12 md:grid-cols-3">
        {features.map(({ title, body, Icon }) => (
          <div key={title} className="rounded-lg border border-border bg-white p-5 shadow-soft">
            <Icon className="size-8 text-primary" />
            <h2 className="mt-5 text-xl font-extrabold">{title}</h2>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">{body}</p>
          </div>
        ))}
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-5 pb-14 lg:grid-cols-[.8fr_1.2fr]">
        <div id="login" className="rounded-lg border border-border bg-white p-6 shadow-soft">
          <p className="text-sm font-bold text-primary">دخول آمن</p>
          <h2 className="mt-2 text-2xl font-extrabold">تسجيل دخول العملاء الحاليين</h2>
          <p className="mb-6 mt-2 text-sm leading-7 text-muted-foreground">استخدم حسابك للدخول إلى لوحة التحكم وإدارة التحصيل مباشرة.</p>
          <LoginForm />
          <div className="mt-5 rounded-md bg-[#eef8f6] p-3 text-sm text-[#31514b]">
            <p className="font-bold">حساب تجريبي</p>
            <p>admin@thimar.sa / Password123!</p>
          </div>
        </div>

        <div id="register" className="rounded-lg border border-border bg-white p-6 shadow-soft">
          <p className="text-sm font-bold text-primary">تفعيل شركة جديدة</p>
          <h2 className="mt-2 text-2xl font-extrabold">إنشاء حساب احترافي للشركة</h2>
          <p className="mt-2 text-sm leading-7 text-muted-foreground">نراجع البريد والسجل التجاري قبل الإنشاء، ثم ننشئ شركة ومدير حساب واشتراك تجريبي.</p>
          <form action={registerTenantPublic} className="mt-6 grid gap-3 md:grid-cols-2">
            <input name="companyName" required className="rounded-md border border-border px-3 py-2 text-sm" placeholder="اسم الشركة" />
            <input name="commercialRegistrationNumber" required className="rounded-md border border-border px-3 py-2 text-sm" placeholder="رقم السجل التجاري" />
            <input name="vatNumber" className="rounded-md border border-border px-3 py-2 text-sm" placeholder="الرقم الضريبي" />
            <input name="city" className="rounded-md border border-border px-3 py-2 text-sm" placeholder="المدينة" />
            <input name="phone" className="rounded-md border border-border px-3 py-2 text-sm" placeholder="الهاتف" />
            <input name="companyEmail" type="email" required className="rounded-md border border-border px-3 py-2 text-sm" placeholder="بريد الشركة" />
            <input name="adminName" required className="rounded-md border border-border px-3 py-2 text-sm" placeholder="اسم مدير الحساب" />
            <input name="adminEmail" type="email" required className="rounded-md border border-border px-3 py-2 text-sm" placeholder="بريد مدير الحساب" />
            <input name="adminPassword" type="password" minLength={8} required className="rounded-md border border-border px-3 py-2 text-sm" placeholder="كلمة المرور" />
            <select name="plan" className="rounded-md border border-border px-3 py-2 text-sm">
              {plans.map((plan) => <option key={plan.id} value={plan.code}>{plan.name} - {Number(plan.monthlyPrice).toLocaleString("ar-SA")} ر.س شهرياً</option>)}
            </select>
            <label className="flex gap-2 text-sm md:col-span-2"><input name="terms" type="checkbox" required /> أوافق على الشروط وسياسة الاستخدام</label>
            <button className="rounded-md bg-primary px-4 py-3 text-sm font-extrabold text-white md:col-span-2">فحص البيانات وإنشاء الحساب</button>
          </form>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-16">
        <div className="grid gap-4 rounded-lg border border-border bg-white p-6 shadow-soft md:grid-cols-4">
          {["تقرير أعمار الديون", "متابعة وعود السداد", "تحصيل شهري", "رسائل وتكاملات"].map((item) => (
            <div key={item} className="flex items-center gap-2 text-sm font-bold"><CheckCircle2 className="size-5 text-primary" />{item}</div>
          ))}
        </div>
      </section>
    </main>
  );
}
