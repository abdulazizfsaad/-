import { startOfMonth } from "date-fns";
import { CaseStage, InvoiceStatus, PromiseStatus, UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { tenantScope } from "@/lib/auth";

type Session = Parameters<typeof tenantScope>[0];

export async function getDashboardData(session: Session) {
  const scope = tenantScope(session);
  const now = new Date();
  const thisMonth = startOfMonth(now);
  const [customers, invoices, cases, payments, promises, collectors, smsMessages, whatsappMessages, subscription] = await Promise.all([
    prisma.customer.findMany({ where: scope }),
    prisma.invoice.findMany({ where: scope, include: { customer: true } }),
    prisma.collectionCase.findMany({ where: scope, include: { assignedCollector: true, customer: true, invoice: true } }),
    prisma.payment.findMany({ where: { ...scope, paymentDate: { gte: thisMonth } } }),
    prisma.promiseToPay.findMany({ where: scope, include: { customer: true } }),
    prisma.user.findMany({ where: { ...scope, role: UserRole.COLLECTOR }, include: { assignedCases: true, payments: true } }),
    prisma.smsMessage.count({ where: { ...scope, createdAt: { gte: thisMonth } } }),
    prisma.whatsAppMessage.count({ where: { ...scope, createdAt: { gte: thisMonth } } }),
    getCurrentSubscription(session)
  ]);
  const totalReceivables = invoices.reduce((sum, invoice) => sum + Number(invoice.remainingAmount), 0);
  const overdueInvoices = invoices.filter((invoice) => invoice.status === InvoiceStatus.OVERDUE || (invoice.dueDate < now && Number(invoice.remainingAmount) > 0));
  const overdueReceivables = overdueInvoices.reduce((sum, invoice) => sum + Number(invoice.remainingAmount), 0);
  const collectedThisMonth = payments.reduce((sum, payment) => sum + Number(payment.amount), 0);
  const originalTotal = invoices.reduce((sum, invoice) => sum + Number(invoice.totalAmount), 0);
  const paidTotal = invoices.reduce((sum, invoice) => sum + Number(invoice.paidAmount), 0);
  const closedStages: CaseStage[] = [CaseStage.CLOSED_PAID, CaseStage.CLOSED_UNCOLLECTIBLE];
  const activeCases = cases.filter((item) => !closedStages.includes(item.stage)).length;
  const missedPromises = promises.filter((promise) => promise.status === PromiseStatus.PENDING && promise.promiseDate < now).length;
  const topCollectors = collectors.map((collector) => ({
    name: collector.name,
    activeCases: collector.assignedCases.length,
    collected: collector.payments.reduce((sum, payment) => sum + Number(payment.amount), 0)
  }));
  return {
    kpis: {
      totalReceivables,
      overdueReceivables,
      collectedThisMonth,
      collectionRate: originalTotal ? Math.round((paidTotal / originalTotal) * 100) : 0,
      activeCustomers: customers.filter((customer) => customer.status === "ACTIVE").length,
      overdueCustomers: new Set(overdueInvoices.map((invoice) => invoice.customerId)).size,
      activeCases,
      missedPromises,
      smsMessages,
      whatsappMessages
    },
    aging: [
      { name: "0-30", value: overdueInvoices.filter((i) => daysLate(i.dueDate, now) <= 30).reduce((s, i) => s + Number(i.remainingAmount), 0) },
      { name: "31-60", value: overdueInvoices.filter((i) => daysLate(i.dueDate, now) > 30 && daysLate(i.dueDate, now) <= 60).reduce((s, i) => s + Number(i.remainingAmount), 0) },
      { name: "61-90", value: overdueInvoices.filter((i) => daysLate(i.dueDate, now) > 60 && daysLate(i.dueDate, now) <= 90).reduce((s, i) => s + Number(i.remainingAmount), 0) },
      { name: "+90", value: overdueInvoices.filter((i) => daysLate(i.dueDate, now) > 90).reduce((s, i) => s + Number(i.remainingAmount), 0) }
    ],
    trend: [
      { name: "يناير", collected: 185000, target: 220000 },
      { name: "فبراير", collected: 231000, target: 240000 },
      { name: "مارس", collected: 276000, target: 260000 },
      { name: "أبريل", collected: collectedThisMonth, target: 280000 }
    ],
    stageChart: Object.values(CaseStage).map((stage) => ({ name: stage, value: cases.filter((item) => item.stage === stage).length })),
    topCollectors,
    recentCases: cases.slice(0, 6),
    customers,
    subscription
  };
}

function daysLate(date: Date, now: Date) {
  return Math.max(0, Math.floor((now.getTime() - date.getTime()) / 86400000));
}

export async function getCustomers(session: Session) {
  return prisma.customer.findMany({ where: tenantScope(session), orderBy: { outstandingBalance: "desc" }, include: { invoices: true, cases: true } });
}

export async function getCustomer(session: Session, id: string) {
  return prisma.customer.findFirst({
    where: { id, ...tenantScope(session) },
    include: {
      invoices: { orderBy: { dueDate: "asc" } },
      cases: { include: { assignedCollector: true, invoice: true, activities: { orderBy: { createdAt: "desc" } } } },
      payments: { orderBy: { paymentDate: "desc" }, include: { invoice: true } },
      promises: true,
      smsMessages: { orderBy: { createdAt: "desc" }, take: 8 },
      whatsappMessages: { orderBy: { createdAt: "desc" }, take: 8 }
    }
  });
}

export async function getInvoices(session: Session) {
  return prisma.invoice.findMany({ where: tenantScope(session), orderBy: { dueDate: "asc" }, include: { customer: true, assignedCollector: true, cases: true, payments: true } });
}

export async function getInvoice(session: Session, id: string) {
  return prisma.invoice.findFirst({ where: { id, ...tenantScope(session) }, include: { customer: true, assignedCollector: true, cases: true, payments: true } });
}

export async function getCases(session: Session) {
  return prisma.collectionCase.findMany({ where: tenantScope(session), orderBy: [{ priority: "desc" }, { nextFollowUpDate: "asc" }], include: { customer: true, assignedCollector: true, invoice: true, activities: { orderBy: { createdAt: "desc" } }, promises: true } });
}

export async function getCase(session: Session, id: string) {
  return prisma.collectionCase.findFirst({ where: { id, ...tenantScope(session) }, include: { customer: true, assignedCollector: true, invoice: true, activities: { orderBy: { createdAt: "desc" }, include: { user: true } }, promises: true, smsMessages: true, whatsappMessages: true } });
}

export async function getPayments(session: Session) {
  return prisma.payment.findMany({ where: tenantScope(session), orderBy: { paymentDate: "desc" }, include: { customer: true, createdBy: true, invoice: true } });
}

export async function getPaymentFormOptions(session: Session) {
  const scope = tenantScope(session);
  const [customers, invoices] = await Promise.all([
    prisma.customer.findMany({ where: scope, orderBy: { companyName: "asc" } }),
    prisma.invoice.findMany({ where: { ...scope, remainingAmount: { gt: 0 } }, orderBy: { dueDate: "asc" }, include: { customer: true } })
  ]);
  return { customers, invoices };
}

export async function getPromises(session: Session) {
  return prisma.promiseToPay.findMany({ where: tenantScope(session), orderBy: { promiseDate: "asc" }, include: { customer: true, case: true } });
}

export async function getUsers(session: Session) {
  return prisma.user.findMany({ where: tenantScope(session), orderBy: { createdAt: "desc" }, include: { tenant: true, roleRecord: true } });
}

export async function getReports(session: Session) {
  const scope = tenantScope(session);
  const [reports, invoices, cases, promises, payments, smsMessages, whatsappMessages] = await Promise.all([
    prisma.reportMetadata.findMany({ where: scope }),
    prisma.invoice.findMany({ where: scope, include: { customer: true } }),
    prisma.collectionCase.findMany({ where: scope, include: { assignedCollector: true, customer: true } }),
    prisma.promiseToPay.findMany({ where: scope, include: { customer: true } }),
    prisma.payment.findMany({ where: scope }),
    prisma.smsMessage.findMany({ where: scope }),
    prisma.whatsAppMessage.findMany({ where: scope })
  ]);
  return { reports, invoices, cases, promises, payments, smsMessages, whatsappMessages };
}

export async function getSettings(session: Session) {
  const tenant = session.user.role === UserRole.SUPER_ADMIN && !session.user.tenantId
    ? await prisma.tenant.findFirst({ include: { subscriptionPlan: true } })
    : await prisma.tenant.findUnique({ where: { id: session.user.tenantId ?? "" }, include: { subscriptionPlan: true } });
  const settings = tenant ? await prisma.systemSetting.findMany({ where: { tenantId: tenant.id } }) : [];
  return { tenant, settings };
}

export async function getCurrentSubscription(session: Session) {
  const scope = tenantScope(session);
  if (!("tenantId" in scope)) return null;
  return prisma.tenantSubscription.findFirst({ where: scope, orderBy: { createdAt: "desc" }, include: { plan: true } });
}

export async function getBillingData(session: Session) {
  const scope = tenantScope(session);
  const [subscription, users, customers, invoices, smsThisMonth, whatsappAccounts] = await Promise.all([
    getCurrentSubscription(session),
    prisma.user.count({ where: scope }),
    prisma.customer.count({ where: scope }),
    prisma.invoice.count({ where: scope }),
    prisma.smsMessage.count({ where: { ...scope, createdAt: { gte: startOfMonth(new Date()) } } }),
    prisma.whatsAppAccount.count({ where: scope })
  ]);
  return { subscription, usage: { users, customers, invoices, smsThisMonth, whatsappAccounts } };
}

export async function getAdminTenants() {
  return prisma.tenant.findMany({
    orderBy: { createdAt: "desc" },
    include: { subscriptionPlan: true, _count: { select: { users: true, customers: true, invoices: true } } }
  });
}

export async function getPlans() {
  return prisma.subscriptionPlan.findMany({ orderBy: { monthlyPrice: "asc" } });
}

export async function getSmsData(session: Session) {
  const scope = tenantScope(session);
  const [providers, messages] = await Promise.all([
    prisma.smsProvider.findMany({ where: scope }),
    prisma.smsMessage.findMany({ where: scope, orderBy: { createdAt: "desc" }, include: { customer: true, case: true, sentBy: true, provider: true } })
  ]);
  return { providers, messages };
}

export async function getWhatsappData(session: Session) {
  const scope = tenantScope(session);
  const [accounts, messages] = await Promise.all([
    prisma.whatsAppAccount.findMany({ where: scope }),
    prisma.whatsAppMessage.findMany({ where: scope, orderBy: { createdAt: "desc" }, include: { customer: true, case: true, sentBy: true, whatsappAccount: true } })
  ]);
  return { accounts, messages };
}
