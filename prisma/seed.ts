import bcrypt from "bcryptjs";
import {
  ActivityType,
  BillingCycle,
  CasePriority,
  CaseStage,
  CustomerStatus,
  EscalationStatus,
  InvoiceStatus,
  MessageStatus,
  PaymentMethod,
  PlanStatus,
  PromiseStatus,
  RiskLevel,
  SubscriptionStatus,
  UserRole,
  UserStatus,
  WhatsAppSessionStatus
} from "@prisma/client";
import { prisma } from "../lib/prisma";

const permissions = {
  dashboard: ["view"],
  customers: ["view", "create", "update", "delete"],
  invoices: ["view", "create", "update", "delete"],
  cases: ["view", "create", "update", "close"],
  payments: ["view", "create"],
  promises: ["view", "create", "update"],
  messages: ["view", "send"],
  reports: ["view", "export"],
  billing: ["view", "manage"],
  users: ["view", "manage"],
  settings: ["view", "manage"]
};

async function reset() {
  await prisma.auditLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.whatsAppMessage.deleteMany();
  await prisma.whatsAppAccount.deleteMany();
  await prisma.smsMessage.deleteMany();
  await prisma.smsProvider.deleteMany();
  await prisma.promiseToPay.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.caseActivity.deleteMany();
  await prisma.collectionCase.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.user.deleteMany();
  await prisma.role.deleteMany();
  await prisma.systemSetting.deleteMany();
  await prisma.reportMetadata.deleteMany();
  await prisma.tenantSubscription.deleteMany();
  await prisma.tenant.deleteMany();
  await prisma.subscriptionPlan.deleteMany();
}

async function seed() {
  await reset();
  const passwordHash = await bcrypt.hash("Password123!", 12);

  const [starter, growth, business, enterprise] = await Promise.all([
    prisma.subscriptionPlan.create({ data: { name: "Starter", code: "starter", monthlyPrice: "499", yearlyPrice: "4990", maxUsers: 5, maxCustomers: 250, maxInvoices: 1000, maxWhatsAppAccounts: 1, maxSmsPerMonth: 500, status: PlanStatus.ACTIVE, features: ["لوحة مؤشرات", "عملاء وفواتير", "رسائل SMS تجريبية"] } }),
    prisma.subscriptionPlan.create({ data: { name: "Growth", code: "growth", monthlyPrice: "1299", yearlyPrice: "12990", maxUsers: 20, maxCustomers: 2500, maxInvoices: 10000, maxWhatsAppAccounts: 3, maxSmsPerMonth: 5000, status: PlanStatus.ACTIVE, features: ["كل مزايا Starter", "قضايا التحصيل", "واتساب QR", "تقارير متقدمة"] } }),
    prisma.subscriptionPlan.create({ data: { name: "Business", code: "business", monthlyPrice: "2499", yearlyPrice: "24990", maxUsers: 60, maxCustomers: 10000, maxInvoices: 50000, maxWhatsAppAccounts: 10, maxSmsPerMonth: 20000, status: PlanStatus.ACTIVE, features: ["صلاحيات متقدمة", "تكاملات متعددة", "تصدير تقارير"] } }),
    prisma.subscriptionPlan.create({ data: { name: "Enterprise", code: "enterprise", monthlyPrice: "0", yearlyPrice: "0", maxUsers: 500, maxCustomers: 100000, maxInvoices: 500000, maxWhatsAppAccounts: 50, maxSmsPerMonth: 250000, status: PlanStatus.ACTIVE, features: ["حدود مخصصة", "SLA", "تكاملات مخصصة", "دعم مؤسسي"] } })
  ]);

  const thimar = await prisma.tenant.create({
    data: {
      name: "شركة ثمار المتحدة لخدمات الأعمال",
      commercialRegistrationNumber: "1010998877",
      vatNumber: "300998877600003",
      industry: "خدمات أعمال وتمويل تشغيلي",
      country: "SA",
      city: "الرياض",
      address: "حي العليا، طريق الملك فهد",
      phone: "0114556600",
      email: "finance@thimar.sa",
      subscriptionPlanId: growth.id,
      subscriptionStatus: SubscriptionStatus.TRIAL,
      trialEndsAt: addDays(new Date(), 14)
    }
  });

  const demo = await prisma.tenant.create({
    data: {
      name: "شركة تجريبية للتجارة",
      commercialRegistrationNumber: "4030445566",
      vatNumber: "310445566700003",
      industry: "تجارة وتوزيع",
      country: "SA",
      city: "جدة",
      address: "شارع الأمير سلطان",
      phone: "0126554433",
      email: "admin@demo-trading.sa",
      subscriptionPlanId: starter.id,
      subscriptionStatus: SubscriptionStatus.ACTIVE
    }
  });

  await Promise.all([
    prisma.tenantSubscription.create({ data: { tenantId: thimar.id, planId: growth.id, status: SubscriptionStatus.TRIAL, billingCycle: BillingCycle.MONTHLY, startDate: new Date(), trialEndsAt: addDays(new Date(), 14), nextBillingDate: addDays(new Date(), 14), amount: "1299", currency: "SAR" } }),
    prisma.tenantSubscription.create({ data: { tenantId: demo.id, planId: starter.id, status: SubscriptionStatus.ACTIVE, billingCycle: BillingCycle.MONTHLY, startDate: addDays(new Date(), -35), nextBillingDate: addDays(new Date(), 25), amount: "499", currency: "SAR" } })
  ]);

  const roleData = [
    [UserRole.SUPER_ADMIN, "مدير النظام", "إدارة كل الشركات والباقات"],
    [UserRole.COMPANY_ADMIN, "مدير الشركة", "إدارة الشركة والمستخدمين والإعدادات"],
    [UserRole.COLLECTION_MANAGER, "مدير التحصيل", "إدارة الفريق والقضايا والتقارير"],
    [UserRole.COLLECTOR, "محصل", "متابعة العملاء والقضايا المسندة"],
    [UserRole.ACCOUNTANT, "محاسب", "إدارة الفواتير والمدفوعات"],
    [UserRole.EXECUTIVE_READONLY, "تنفيذي للاطلاع", "قراءة المؤشرات والتقارير"]
  ] as const;

  const roles = new Map<UserRole, string>();
  for (const [role, name, description] of roleData) {
    const record = await prisma.role.create({ data: { tenantId: role === UserRole.SUPER_ADMIN ? null : thimar.id, name, description, systemRole: role, permissions } });
    roles.set(role, record.id);
  }

  await Promise.all([
    prisma.user.create({ data: { name: "مدير النظام", email: "super@thimar.sa", passwordHash, phone: "0500000001", role: UserRole.SUPER_ADMIN, roleId: roles.get(UserRole.SUPER_ADMIN), status: UserStatus.ACTIVE } }),
    prisma.user.create({ data: { tenantId: thimar.id, name: "نورة السالم", email: "admin@thimar.sa", passwordHash, phone: "0551112233", role: UserRole.COMPANY_ADMIN, roleId: roles.get(UserRole.COMPANY_ADMIN), status: UserStatus.ACTIVE } }),
    prisma.user.create({ data: { tenantId: thimar.id, name: "خالد العتيبي", email: "manager@thimar.sa", passwordHash, phone: "0553332211", role: UserRole.COLLECTION_MANAGER, roleId: roles.get(UserRole.COLLECTION_MANAGER), status: UserStatus.ACTIVE } }),
    prisma.user.create({ data: { tenantId: thimar.id, name: "سارة القحطاني", email: "collector@thimar.sa", passwordHash, phone: "0557778899", role: UserRole.COLLECTOR, roleId: roles.get(UserRole.COLLECTOR), status: UserStatus.ACTIVE } }),
    prisma.user.create({ data: { tenantId: thimar.id, name: "عبدالله الحربي", email: "accountant@thimar.sa", passwordHash, phone: "0559009001", role: UserRole.ACCOUNTANT, roleId: roles.get(UserRole.ACCOUNTANT), status: UserStatus.ACTIVE } }),
    prisma.user.create({ data: { tenantId: thimar.id, name: "ريم المطيري", email: "executive@thimar.sa", passwordHash, phone: "0558008002", role: UserRole.EXECUTIVE_READONLY, roleId: roles.get(UserRole.EXECUTIVE_READONLY), status: UserStatus.ACTIVE } }),
    prisma.user.create({ data: { tenantId: demo.id, name: "محمد الهاجري", email: "admin@demo-trading.sa", passwordHash, phone: "0502223334", role: UserRole.COMPANY_ADMIN, status: UserStatus.ACTIVE } })
  ]);

  const collector = await prisma.user.findUniqueOrThrow({ where: { email: "collector@thimar.sa" } });
  const accountant = await prisma.user.findUniqueOrThrow({ where: { email: "accountant@thimar.sa" } });

  const names = [
    ["مؤسسة النخبة للمقاولات", "أحمد بن صالح", "الرياض"], ["شركة المدار الطبية", "ليان الدوسري", "الدمام"], ["أسواق الربيع المركزية", "يوسف المالكي", "جدة"],
    ["مصنع سدير للتغليف", "بدر العنزي", "الرياض"], ["شركة الواحة للأغذية", "هند الشهري", "مكة"], ["مجموعة الخليج للتوريد", "سلمان الهاجري", "الخبر"],
    ["شركة أفق التقنية", "مشاعل القحطاني", "الرياض"], ["مؤسسة الروافد اللوجستية", "راكان المطيري", "بريدة"], ["شركة الدرعية للمفروشات", "محمد الغامدي", "الرياض"],
    ["مصنع البيان للبلاستيك", "نواف الحربي", "ينبع"], ["شركة الصفوة العقارية", "عبدالعزيز الرشيد", "الرياض"], ["مؤسسة سنام الطبية", "أمل الزهراني", "الطائف"],
    ["شركة جسور الخليج", "فيصل الدوسري", "الدمام"], ["مركز الرواد التجاري", "تركي الشمري", "حائل"], ["شركة مرسى البحر للتجارة", "علي القرني", "جدة"]
  ];

  const customers = [];
  for (let i = 0; i < names.length; i++) {
    const [companyName, name, city] = names[i];
    customers.push(await prisma.customer.create({
      data: {
        tenantId: thimar.id,
        name,
        companyName,
        customerCode: `C-${String(i + 1).padStart(4, "0")}`,
        commercialRegistrationNumber: `10${10000000 + i}`,
        vatNumber: `30${100000000 + i}00003`,
        phone: `0114${String(500000 + i).padStart(6, "0")}`,
        whatsapp: `96655${String(1000000 + i).padStart(7, "0")}`,
        email: `ap${i + 1}@example.sa`,
        city,
        address: `${city} - شارع الأعمال`,
        creditLimit: String(120000 + i * 35000),
        paymentTerms: [15, 30, 45, 60][i % 4],
        riskLevel: [RiskLevel.LOW, RiskLevel.MEDIUM, RiskLevel.HIGH, RiskLevel.CRITICAL][i % 4],
        status: i % 5 === 0 ? CustomerStatus.HIGH_RISK : CustomerStatus.ACTIVE,
        notes: "بيانات تجريبية لعميل ذمم مدينة في السوق السعودي."
      }
    }));
  }

  const invoices = [];
  for (let i = 0; i < 30; i++) {
    const customer = customers[i % customers.length];
    const total = 18000 + i * 3700;
    const paid = i % 5 === 0 ? total : i % 3 === 0 ? Math.floor(total * 0.45) : 0;
    const remaining = total - paid;
    const dueDate = addDays(new Date(), i % 5 === 0 ? 20 : -1 * (5 + i * 3));
    const status = remaining === 0 ? InvoiceStatus.PAID : i % 7 === 0 ? InvoiceStatus.DISPUTED : dueDate < new Date() ? InvoiceStatus.OVERDUE : paid > 0 ? InvoiceStatus.PARTIAL : InvoiceStatus.UNPAID;
    invoices.push(await prisma.invoice.create({
      data: {
        tenantId: thimar.id,
        customerId: customer.id,
        invoiceNumber: `INV-2026-${String(i + 1).padStart(4, "0")}`,
        invoiceDate: addDays(dueDate, -30),
        dueDate,
        totalAmount: String(total),
        paidAmount: String(paid),
        remainingAmount: String(remaining),
        vatAmount: String(total * 0.15),
        currency: "SAR",
        status,
        overdueDays: Math.max(0, daysBetween(dueDate, new Date())),
        assignedCollectorId: collector.id
      }
    }));
  }

  for (const customer of customers) {
    const balance = invoices.filter((invoice) => invoice.customerId === customer.id).reduce((sum, invoice) => sum + Number(invoice.remainingAmount), 0);
    await prisma.customer.update({ where: { id: customer.id }, data: { outstandingBalance: String(balance) } });
  }

  const openInvoices = invoices.filter((invoice) => Number(invoice.remainingAmount) > 0).slice(0, 15);
  const cases = [];
  for (let i = 0; i < openInvoices.length; i++) {
    const invoice = openInvoices[i];
    cases.push(await prisma.collectionCase.create({
      data: {
        tenantId: thimar.id,
        customerId: invoice.customerId,
        invoiceId: invoice.id,
        caseNumber: `CASE-2026-${String(i + 1).padStart(4, "0")}`,
        outstandingAmount: invoice.remainingAmount,
        priority: [CasePriority.LOW, CasePriority.MEDIUM, CasePriority.HIGH, CasePriority.CRITICAL][i % 4],
        stage: [CaseStage.NEW, CaseStage.PENDING_FOLLOW_UP, CaseStage.CONTACTED, CaseStage.PROMISE_TO_PAY, CaseStage.NO_RESPONSE, CaseStage.DISPUTED, CaseStage.ESCALATED][i % 7],
        assignedCollectorId: collector.id,
        nextFollowUpDate: addDays(new Date(), (i % 6) + 1),
        escalationStatus: i % 6 === 0 ? EscalationStatus.MANAGER : EscalationStatus.NONE,
        disputeFlag: i % 7 === 0,
        legalEscalation: i % 11 === 0,
        notes: "حالة تحصيل تجريبية مع ملاحظات متابعة وتواصل."
      }
    }));
  }

  for (const item of cases) {
    await prisma.caseActivity.create({ data: { tenantId: thimar.id, caseId: item.id, userId: collector.id, type: ActivityType.CALL, summary: "تم الاتصال بقسم الحسابات لتأكيد موعد السداد.", outcome: "بانتظار اعتماد الدفعة", nextActionDate: addDays(new Date(), 2) } });
  }

  for (let i = 0; i < 10; i++) {
    const invoice = invoices[i * 2];
    const amount = Math.min(8000 + i * 1500, Number(invoice.remainingAmount) || Number(invoice.totalAmount));
    await prisma.payment.create({ data: { tenantId: thimar.id, customerId: invoice.customerId, invoiceId: invoice.id, paymentNumber: `PAY-2026-${String(i + 1).padStart(4, "0")}`, amount: String(amount), currency: "SAR", paymentDate: addDays(new Date(), -i), method: i % 2 ? PaymentMethod.SADAD : PaymentMethod.BANK_TRANSFER, referenceNumber: `REF-${10000 + i}`, notes: "دفعة تجريبية مخصصة للفاتورة.", createdById: accountant.id } });
  }

  for (let i = 0; i < 10; i++) {
    const item = cases[i];
    await prisma.promiseToPay.create({ data: { tenantId: thimar.id, caseId: item.id, customerId: item.customerId, promisedAmount: String(10000 + i * 2500), promiseDate: addDays(new Date(), i % 3 === 0 ? -2 : i + 2), committedBy: names[i][1], status: i % 3 === 0 ? PromiseStatus.BROKEN : PromiseStatus.PENDING, notes: "وعد سداد مسجل من العميل." } });
  }

  const smsProvider = await prisma.smsProvider.create({ data: { tenantId: thimar.id, providerName: "Demo SMS", providerCode: "generic", apiBaseUrl: process.env.SMS_BASE_URL, senderName: "THIMAR", isActive: true, settingsJson: { mode: "demo", supported: ["twilio", "unifonic", "taqnyat", "msegat", "4jawaly", "generic"] } } });
  const waAccount = await prisma.whatsAppAccount.create({ data: { tenantId: thimar.id, name: "حساب واتساب التحصيل", phoneNumber: "966551112233", provider: "qr-demo", status: "DEMO", qrCodeUrl: "/qr-demo.svg", sessionStatus: WhatsAppSessionStatus.QR_PENDING, settingsJson: { mode: "demo" } } });

  for (let i = 0; i < 6; i++) {
    await prisma.smsMessage.create({ data: { tenantId: thimar.id, customerId: customers[i].id, caseId: cases[i]?.id, providerId: smsProvider.id, recipientPhone: customers[i].phone ?? "0500000000", messageBody: "تذكير: توجد فاتورة مستحقة، نأمل السداد أو التواصل مع فريق التحصيل.", status: MessageStatus.DEMO, sentById: collector.id, sentAt: new Date() } });
    await prisma.whatsAppMessage.create({ data: { tenantId: thimar.id, customerId: customers[i].id, caseId: cases[i]?.id, whatsappAccountId: waAccount.id, recipientPhone: customers[i].whatsapp ?? "966500000000", messageBody: "مرحباً، نذكركم بموعد سداد الفاتورة ونشكر تعاونكم.", status: MessageStatus.DEMO, sentById: collector.id, sentAt: new Date() } });
  }

  await Promise.all([
    prisma.systemSetting.create({ data: { tenantId: null, key: "payment_gateways_ready", value: { moyasar: false, hyperpay: false, stripe: false, tap: false } } }),
    prisma.systemSetting.create({ data: { tenantId: thimar.id, key: "collection_policy", value: { reminderDays: [7, 3, 1], escalationAfterDays: 45, defaultCurrency: "SAR" } } }),
    prisma.reportMetadata.create({ data: { tenantId: thimar.id, key: "aging", title: "تقرير أعمار الديون", description: "تجميع الأرصدة حسب شرائح التأخير." } }),
    prisma.reportMetadata.create({ data: { tenantId: thimar.id, key: "messages", title: "تقرير الرسائل", description: "سجل SMS وواتساب حسب الحالة والقناة." } }),
    prisma.notification.create({ data: { tenantId: thimar.id, userId: collector.id, type: "FOLLOW_UP", title: "متابعة مستحقة", body: "لديك حالات تحتاج متابعة اليوم." } }),
    prisma.auditLog.create({ data: { tenantId: thimar.id, action: "seed.created", entityType: "Tenant", entityId: thimar.id, newValue: { source: "demo seed" } } })
  ]);

  console.log("Seed completed. Demo login: admin@thimar.sa / Password123!");
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function daysBetween(start: Date, end: Date) {
  return Math.floor((end.getTime() - start.getTime()) / 86400000);
}

seed()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
