import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-background px-4">
      <section className="grid w-full max-w-5xl overflow-hidden rounded-lg border border-border bg-white shadow-soft md:grid-cols-[1fr_1.1fr]">
        <div className="bg-[#0f766e] p-8 text-white">
          <div className="mb-12 grid size-14 place-items-center rounded-lg bg-white/15 text-2xl font-extrabold">ذ</div>
          <h1 className="max-w-sm text-3xl font-extrabold leading-snug">منصة التحصيل والذمم المدينة للشركات في السعودية والخليج</h1>
          <p className="mt-5 max-w-md text-sm leading-7 text-white/85">تابع الفواتير المتأخرة، وعود السداد، أداء المحصلين، والتقارير التنفيذية من مكان واحد.</p>
          <div className="mt-10 grid gap-3 text-sm font-bold">
            <p>حساب تجريبي: admin@riyadh-trading.sa</p>
            <p>كلمة المرور: Password123!</p>
          </div>
        </div>
        <div className="p-8 md:p-10">
          <p className="text-sm font-bold text-primary">تسجيل الدخول</p>
          <h2 className="mt-2 text-2xl font-extrabold">مرحباً بك</h2>
          <p className="mb-8 mt-2 text-sm text-muted-foreground">استخدم حسابك المؤسسي للدخول إلى لوحة التحصيل.</p>
          <LoginForm />
        </div>
      </section>
    </main>
  );
}
