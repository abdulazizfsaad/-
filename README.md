# ثمار للتحصيل - SaaS لإدارة الذمم المدينة

منصة عربية RTL-first لإدارة الحسابات المدينة والتحصيل للشركات في السعودية ودول الخليج.

## المزايا الحالية

- تعدد شركات `Multi-tenant`
- تسجيل شركة جديدة عبر `/register`
- دخول آمن عبر NextAuth Credentials
- أدوار: مدير النظام، مدير الشركة، مدير التحصيل، محصل، محاسب، تنفيذي للاطلاع
- باقات اشتراك: Starter, Growth, Business, Enterprise
- عملاء، فواتير، قضايا تحصيل، مدفوعات، وعود سداد
- SMS وWhatsApp provider abstraction مع وضع تجريبي عند غياب المفاتيح
- تقارير، فوترة، إعدادات، سجل رسائل، وتنبيهات
- Prisma + PostgreSQL كمصدر الحقيقة

## متطلبات Windows

1. Node.js LTS
2. PostgreSQL 16 أو أحدث
3. قاعدة بيانات باسم `saas_receivables`

## إعداد البيئة

```powershell
cd C:\Users\abdul\.codex\saas-receivables
copy .env.example .env
npm install
npx prisma generate
npx prisma db push --accept-data-loss
node prisma\seed-runner.js
npm run dev
```

## متغيرات البيئة

راجع `.env.example`. لا ترفع ملف `.env` إلى GitHub.

متغيرات أساسية:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/saas_receivables?schema=public"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="replace-with-a-long-random-secret"
SMS_PROVIDER="generic"
SMS_API_KEY=""
SMS_SENDER_NAME="THIMAR"
SMS_BASE_URL=""
WHATSAPP_PROVIDER="qr-demo"
WHATSAPP_ACCESS_TOKEN=""
WHATSAPP_PHONE_NUMBER_ID=""
WHATSAPP_BUSINESS_ACCOUNT_ID=""
WHATSAPP_WEBHOOK_VERIFY_TOKEN=""
WHATSAPP_QR_PROVIDER_URL=""
WHATSAPP_QR_PROVIDER_TOKEN=""
```

## حسابات تجريبية

كلمة المرور لكل الحسابات:

```text
Password123!
```

- `admin@thimar.sa`
- `manager@thimar.sa`
- `collector@thimar.sa`
- `accountant@thimar.sa`
- `executive@thimar.sa`
- `super@thimar.sa`

## صفحات رئيسية

- `/login`
- `/register`
- `/dashboard`
- `/customers`
- `/customers/new`
- `/invoices`
- `/invoices/new`
- `/cases`
- `/cases/new`
- `/payments`
- `/promises`
- `/billing`
- `/admin/tenants`
- `/admin/plans`
- `/settings/integrations/sms`
- `/settings/integrations/whatsapp`
- `/sms/messages`
- `/whatsapp/messages`
- `/reports`

## أوامر التحقق

```powershell
npm run build
node prisma\seed-runner.js
```

## ملاحظات النشر

- استخدم PostgreSQL مُدار في الإنتاج.
- نفذ `npx prisma generate` أثناء البناء.
- أنشئ migrations إنتاجية قبل الإطلاق الرسمي. في بيئة التطوير الحالية تمت مزامنة قاعدة البيانات عبر `prisma db push` بسبب قيود non-interactive shell.
- اربط مزودي SMS وWhatsApp عبر متغيرات البيئة أو خزنة أسرار آمنة.
- جهز تكاملات الدفع المستقبلية: Moyasar وHyperPay وStripe وTap Payments.
