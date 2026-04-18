import { CasePriority, CaseStage, InvoiceStatus, PromiseStatus, RiskLevel } from "@prisma/client";
import { tenantScope } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Session = Parameters<typeof tenantScope>[0];

const closedStages: CaseStage[] = [CaseStage.CLOSED_PAID, CaseStage.CLOSED_UNCOLLECTIBLE];

export type CollectorQueueItem = {
  customerId: string;
  customerName: string;
  companyName: string;
  invoiceId: string;
  invoiceNumber: string;
  caseId: string | null;
  caseNumber: string | null;
  collectorName: string;
  amount: number;
  overdueDays: number;
  riskScore: number;
  riskBand: "منخفض" | "متوسط" | "مرتفع" | "حرج";
  dunningStage: string;
  recommendedChannel: string;
  nextBestAction: string;
  priority: CasePriority;
  hasBrokenPromise: boolean;
  hasDispute: boolean;
};

export async function getCollectionsIntelligence(session: Session) {
  const scope = tenantScope(session);
  const now = new Date();
  const [invoices, cases, promises, smsMessages, whatsappMessages, payments] = await Promise.all([
    prisma.invoice.findMany({
      where: { ...scope, remainingAmount: { gt: 0 } },
      include: {
        customer: true,
        assignedCollector: true,
        cases: {
          where: { stage: { notIn: closedStages } },
          include: { activities: { orderBy: { createdAt: "desc" }, take: 1 }, assignedCollector: true }
        }
      },
      orderBy: [{ dueDate: "asc" }, { remainingAmount: "desc" }]
    }),
    prisma.collectionCase.findMany({ where: scope, include: { customer: true, assignedCollector: true } }),
    prisma.promiseToPay.findMany({ where: scope, include: { customer: true, case: true } }),
    prisma.smsMessage.findMany({ where: scope, orderBy: { createdAt: "desc" }, take: 200 }),
    prisma.whatsAppMessage.findMany({ where: scope, orderBy: { createdAt: "desc" }, take: 200 }),
    prisma.payment.findMany({ where: scope, orderBy: { paymentDate: "desc" }, take: 200 })
  ]);

  const queue = invoices
    .filter((invoice) => invoice.status !== InvoiceStatus.PAID)
    .map((invoice) => {
      const activeCase = invoice.cases[0] ?? null;
      const customerPromises = promises.filter((promise) => promise.customerId === invoice.customerId);
      const brokenPromises = customerPromises.filter((promise) => promise.status === PromiseStatus.BROKEN || (promise.status === PromiseStatus.PENDING && promise.promiseDate < now));
      const lastActivity = activeCase?.activities[0]?.createdAt ?? null;
      const overdueDays = Math.max(0, Math.floor((now.getTime() - invoice.dueDate.getTime()) / 86400000));
      const amount = Number(invoice.remainingAmount);
      const hasDispute = invoice.status === InvoiceStatus.DISPUTED || activeCase?.disputeFlag === true;
      const score = scoreAccount({
        amount,
        overdueDays,
        riskLevel: invoice.customer.riskLevel,
        hasBrokenPromise: brokenPromises.length > 0,
        hasDispute,
        isEscalated: invoice.status === InvoiceStatus.ESCALATED || activeCase?.stage === CaseStage.ESCALATED,
        lastActivity
      });

      return {
        customerId: invoice.customerId,
        customerName: invoice.customer.name,
        companyName: invoice.customer.companyName,
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        caseId: activeCase?.id ?? null,
        caseNumber: activeCase?.caseNumber ?? null,
        collectorName: activeCase?.assignedCollector?.name ?? invoice.assignedCollector?.name ?? "غير مسند",
        amount,
        overdueDays,
        riskScore: score,
        riskBand: riskBand(score),
        dunningStage: dunningStage(overdueDays),
        recommendedChannel: recommendedChannel(overdueDays, brokenPromises.length > 0, invoice.customer.whatsapp, invoice.customer.phone),
        nextBestAction: nextBestAction(overdueDays, amount, brokenPromises.length > 0, hasDispute, activeCase?.stage),
        priority: priorityFromScore(score),
        hasBrokenPromise: brokenPromises.length > 0,
        hasDispute
      } satisfies CollectorQueueItem;
    })
    .sort((a, b) => b.riskScore - a.riskScore || b.amount - a.amount);

  const openCases = cases.filter((item) => !closedStages.includes(item.stage));
  const overdueReceivables = queue.reduce((sum, item) => sum + item.amount, 0);
  const criticalExposure = queue.filter((item) => item.riskBand === "حرج").reduce((sum, item) => sum + item.amount, 0);
  const brokenPromises = promises.filter((promise) => promise.status === PromiseStatus.BROKEN || (promise.status === PromiseStatus.PENDING && promise.promiseDate < now));
  const disputes = queue.filter((item) => item.hasDispute);
  const collected30Days = payments
    .filter((payment) => now.getTime() - payment.paymentDate.getTime() <= 30 * 86400000)
    .reduce((sum, payment) => sum + Number(payment.amount), 0);

  return {
    summary: {
      healthScore: collectionHealthScore(queue, openCases.length, brokenPromises.length),
      overdueReceivables,
      criticalExposure,
      criticalAccounts: queue.filter((item) => item.riskBand === "حرج").length,
      brokenPromises: brokenPromises.length,
      disputes: disputes.length,
      collected30Days,
      activeCases: openCases.length,
      smsTouches: smsMessages.length,
      whatsappTouches: whatsappMessages.length
    },
    aging: {
      current: queue.filter((item) => item.overdueDays === 0).reduce((sum, item) => sum + item.amount, 0),
      d1To30: queue.filter((item) => item.overdueDays > 0 && item.overdueDays <= 30).reduce((sum, item) => sum + item.amount, 0),
      d31To60: queue.filter((item) => item.overdueDays > 30 && item.overdueDays <= 60).reduce((sum, item) => sum + item.amount, 0),
      d61To90: queue.filter((item) => item.overdueDays > 60 && item.overdueDays <= 90).reduce((sum, item) => sum + item.amount, 0),
      d90Plus: queue.filter((item) => item.overdueDays > 90).reduce((sum, item) => sum + item.amount, 0)
    },
    queue: queue.slice(0, 25),
    executiveAlerts: buildExecutiveAlerts(queue, brokenPromises.length, disputes.length)
  };
}

function scoreAccount(input: { amount: number; overdueDays: number; riskLevel: RiskLevel; hasBrokenPromise: boolean; hasDispute: boolean; isEscalated: boolean; lastActivity: Date | null }) {
  const amountScore = Math.min(25, Math.floor(input.amount / 10000));
  const overdueScore = input.overdueDays > 90 ? 35 : input.overdueDays > 60 ? 28 : input.overdueDays > 30 ? 20 : input.overdueDays > 7 ? 12 : input.overdueDays > 0 ? 6 : 0;
  const riskScore = input.riskLevel === RiskLevel.CRITICAL ? 20 : input.riskLevel === RiskLevel.HIGH ? 14 : input.riskLevel === RiskLevel.MEDIUM ? 7 : 2;
  const promiseScore = input.hasBrokenPromise ? 18 : 0;
  const disputeScore = input.hasDispute ? 12 : 0;
  const escalationScore = input.isEscalated ? 15 : 0;
  const staleActivityScore = !input.lastActivity || Date.now() - input.lastActivity.getTime() > 7 * 86400000 ? 8 : 0;
  return Math.min(100, amountScore + overdueScore + riskScore + promiseScore + disputeScore + escalationScore + staleActivityScore);
}

function riskBand(score: number): CollectorQueueItem["riskBand"] {
  if (score >= 75) return "حرج";
  if (score >= 55) return "مرتفع";
  if (score >= 30) return "متوسط";
  return "منخفض";
}

function priorityFromScore(score: number) {
  if (score >= 75) return CasePriority.CRITICAL;
  if (score >= 55) return CasePriority.HIGH;
  if (score >= 30) return CasePriority.MEDIUM;
  return CasePriority.LOW;
}

function dunningStage(days: number) {
  if (days <= 0) return "تذكير قبل الاستحقاق";
  if (days <= 7) return "متابعة ودية";
  if (days <= 30) return "مطالبة رسمية";
  if (days <= 60) return "تصعيد لمدير التحصيل";
  if (days <= 90) return "خطة سداد أو إيقاف ائتمان";
  return "مراجعة قانونية وتنفيذية";
}

function recommendedChannel(days: number, hasBrokenPromise: boolean, whatsapp?: string | null, phone?: string | null) {
  if (hasBrokenPromise && phone) return "اتصال مباشر ثم واتساب";
  if (days > 60 && phone) return "اتصال مدير التحصيل";
  if (whatsapp) return "واتساب";
  if (phone) return "SMS";
  return "تحديث بيانات التواصل";
}

function nextBestAction(days: number, amount: number, hasBrokenPromise: boolean, hasDispute: boolean, stage?: CaseStage) {
  if (hasDispute) return "حسم سبب النزاع وتوثيق المستند الناقص خلال 24 ساعة";
  if (hasBrokenPromise) return "اتصال تصعيدي وتثبيت وعد جديد أو تحصيل دفعة فورية";
  if (stage === CaseStage.NO_RESPONSE) return "تغيير قناة التواصل وإشعار مدير الحساب";
  if (days > 90) return "تجميد ائتمان العميل وتجهيز ملف التصعيد القانوني";
  if (days > 60 || amount > 100000) return "اجتماع مدير التحصيل مع العميل وجدولة خطة سداد";
  if (days > 30) return "إرسال مطالبة رسمية وتحديد موعد متابعة ملزم";
  if (days > 0) return "تذكير فوري مع رابط أو تعليمات السداد";
  return "تذكير استباقي قبل الاستحقاق";
}

function collectionHealthScore(queue: CollectorQueueItem[], activeCases: number, brokenPromises: number) {
  const criticalPenalty = queue.filter((item) => item.riskBand === "حرج").length * 6;
  const overduePenalty = Math.min(35, queue.filter((item) => item.overdueDays > 30).length * 3);
  const casePenalty = Math.min(15, Math.floor(activeCases / 4));
  const promisePenalty = brokenPromises * 4;
  return Math.max(1, Math.min(100, 100 - criticalPenalty - overduePenalty - casePenalty - promisePenalty));
}

function buildExecutiveAlerts(queue: CollectorQueueItem[], brokenPromises: number, disputes: number) {
  const alerts: string[] = [];
  const critical = queue.filter((item) => item.riskBand === "حرج");
  const over90 = queue.filter((item) => item.overdueDays > 90);
  if (critical.length) alerts.push(`${critical.length} حسابات حرجة تحتاج قرارًا اليوم قبل زيادة التعثر.`);
  if (over90.length) alerts.push(`${over90.length} فواتير تجاوزت 90 يومًا ويجب مراجعة حدود الائتمان.`);
  if (brokenPromises) alerts.push(`${brokenPromises} وعود سداد مكسورة تستدعي اتصالًا مباشرًا من المدير.`);
  if (disputes) alerts.push(`${disputes} ملفات نزاع قد تؤخر التحصيل ما لم يتم إغلاق المستندات.`);
  return alerts.length ? alerts : ["لا توجد إنذارات تنفيذية حرجة حاليًا. استمر في المتابعة الوقائية."];
}
