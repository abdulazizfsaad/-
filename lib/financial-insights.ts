import { InvoiceStatus, PromiseStatus, RiskLevel } from "@prisma/client";
import { tenantScope } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Session = Parameters<typeof tenantScope>[0];

export async function getFinancialHealth(session: Session) {
  const scope = tenantScope(session);
  const now = new Date();
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 86400000);
  const [customers, invoices, payments, promises, cases] = await Promise.all([
    prisma.customer.findMany({ where: scope, include: { invoices: true } }),
    prisma.invoice.findMany({ where: scope, include: { customer: true } }),
    prisma.payment.findMany({ where: scope }),
    prisma.promiseToPay.findMany({ where: scope }),
    prisma.collectionCase.findMany({ where: scope, include: { customer: true } })
  ]);

  const totalReceivables = invoices.reduce((sum, invoice) => sum + Number(invoice.remainingAmount), 0);
  const overdueInvoices = invoices.filter((invoice) => Number(invoice.remainingAmount) > 0 && (invoice.status === InvoiceStatus.OVERDUE || invoice.dueDate < now));
  const overdueReceivables = overdueInvoices.reduce((sum, invoice) => sum + Number(invoice.remainingAmount), 0);
  const totalCreditSales90 = invoices.filter((invoice) => invoice.invoiceDate >= ninetyDaysAgo).reduce((sum, invoice) => sum + Number(invoice.totalAmount), 0);
  const averageDailySales = totalCreditSales90 / 90 || 1;
  const dso = Math.round(totalReceivables / averageDailySales);
  const collected90 = payments.filter((payment) => payment.paymentDate >= ninetyDaysAgo).reduce((sum, payment) => sum + Number(payment.amount), 0);
  const collectionEffectiveness = Math.min(100, Math.round((collected90 / Math.max(totalCreditSales90, 1)) * 100));
  const overdueRatio = Math.round((overdueReceivables / Math.max(totalReceivables, 1)) * 100);
  const brokenPromises = promises.filter((promise) => promise.status === PromiseStatus.BROKEN || (promise.status === PromiseStatus.PENDING && promise.promiseDate < now));
  const promiseBreakRate = Math.round((brokenPromises.length / Math.max(promises.length, 1)) * 100);
  const creditExposure = customers.map((customer) => {
    const outstanding = Number(customer.outstandingBalance);
    const limit = Number(customer.creditLimit) || 1;
    return {
      id: customer.id,
      companyName: customer.companyName,
      riskLevel: customer.riskLevel,
      outstanding,
      creditLimit: Number(customer.creditLimit),
      utilization: Math.round((outstanding / limit) * 100),
      overdue: overdueInvoices.filter((invoice) => invoice.customerId === customer.id).reduce((sum, invoice) => sum + Number(invoice.remainingAmount), 0)
    };
  }).sort((a, b) => b.outstanding - a.outstanding);
  const concentrationTop5 = creditExposure.slice(0, 5).reduce((sum, customer) => sum + customer.outstanding, 0);
  const concentrationRatio = Math.round((concentrationTop5 / Math.max(totalReceivables, 1)) * 100);
  const cashForecast30 = promises
    .filter((promise) => promise.status === PromiseStatus.PENDING && promise.promiseDate >= now && promise.promiseDate <= new Date(now.getTime() + 30 * 86400000))
    .reduce((sum, promise) => sum + Number(promise.promisedAmount), 0);
  const highRiskExposure = creditExposure.filter((customer) => customer.riskLevel === RiskLevel.HIGH || customer.riskLevel === RiskLevel.CRITICAL).reduce((sum, customer) => sum + customer.outstanding, 0);

  return {
    kpis: {
      totalReceivables,
      overdueReceivables,
      overdueRatio,
      dso,
      collectionEffectiveness,
      promiseBreakRate,
      cashForecast30,
      highRiskExposure,
      concentrationRatio,
      activeCases: cases.filter((item) => !["CLOSED_PAID", "CLOSED_UNCOLLECTIBLE"].includes(item.stage)).length
    },
    topExposures: creditExposure.slice(0, 10),
    recommendations: buildRecommendations({ dso, overdueRatio, promiseBreakRate, concentrationRatio, highRiskExposure, totalReceivables })
  };
}

function buildRecommendations(input: { dso: number; overdueRatio: number; promiseBreakRate: number; concentrationRatio: number; highRiskExposure: number; totalReceivables: number }) {
  const recommendations: string[] = [];
  if (input.dso > 60) recommendations.push("خفض DSO عبر تذكير قبل الاستحقاق وربط كل فاتورة بخطة متابعة قبل يوم الاستحقاق.");
  if (input.overdueRatio > 35) recommendations.push("تجميد الائتمان للعملاء الذين تجاوزوا 90 يومًا أو تخطوا 100% من حد الائتمان.");
  if (input.promiseBreakRate > 25) recommendations.push("تطبيق قاعدة: أي وعد سداد مكسور يتحول تلقائيًا إلى اتصال مدير التحصيل خلال 24 ساعة.");
  if (input.concentrationRatio > 50) recommendations.push("مراجعة تركيز المخاطر: أعلى 5 عملاء يسيطرون على أكثر من نصف الذمم.");
  if (input.highRiskExposure > input.totalReceivables * 0.25) recommendations.push("رفع ملف التعرض عالي المخاطر إلى الإدارة المالية أسبوعيًا مع خطة سداد لكل عميل.");
  return recommendations.length ? recommendations : ["الوضع المالي مستقر، ركز على المتابعة الوقائية وحماية العلاقة مع العملاء المنتظمين."];
}
