import { CasePriority, CaseStage, InvoiceStatus, PromiseStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function updateInvoiceStatus(invoiceId: string) {
  const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });
  if (!invoice) return null;
  const remaining = Number(invoice.remainingAmount);
  const overdueDays = Math.max(0, Math.floor((Date.now() - invoice.dueDate.getTime()) / 86400000));
  const status = remaining <= 0 ? InvoiceStatus.PAID : overdueDays > 0 ? InvoiceStatus.OVERDUE : Number(invoice.paidAmount) > 0 ? InvoiceStatus.PARTIAL : InvoiceStatus.UNPAID;
  return prisma.invoice.update({ where: { id: invoiceId }, data: { status, overdueDays } });
}

export async function generateCollectionCase(invoiceId: string) {
  const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId }, include: { cases: true, customer: true } });
  if (!invoice || Number(invoice.remainingAmount) <= 0 || invoice.cases.length > 0) return null;
  const count = await prisma.collectionCase.count({ where: { tenantId: invoice.tenantId } });
  return prisma.collectionCase.create({
    data: {
      tenantId: invoice.tenantId,
      customerId: invoice.customerId,
      invoiceId: invoice.id,
      caseNumber: `CASE-${new Date().getFullYear()}-${String(count + 1).padStart(5, "0")}`,
      outstandingAmount: invoice.remainingAmount,
      priority: invoice.overdueDays > 60 ? CasePriority.HIGH : CasePriority.MEDIUM,
      stage: CaseStage.NEW,
      assignedCollectorId: invoice.assignedCollectorId,
      notes: "تم إنشاء الحالة تلقائياً بسبب تأخر الفاتورة."
    }
  });
}

export async function updatePromiseStatuses(tenantId?: string) {
  return prisma.promiseToPay.updateMany({
    where: { ...(tenantId ? { tenantId } : {}), status: PromiseStatus.PENDING, promiseDate: { lt: new Date() } },
    data: { status: PromiseStatus.BROKEN }
  });
}

export async function recalculateCustomerBalance(customerId: string) {
  const invoices = await prisma.invoice.findMany({ where: { customerId } });
  const outstandingBalance = invoices.reduce((sum, invoice) => sum + Number(invoice.remainingAmount), 0);
  return prisma.customer.update({ where: { id: customerId }, data: { outstandingBalance } });
}

export async function enforceSubscriptionLimits(tenantId: string) {
  const subscription = await prisma.tenantSubscription.findFirst({ where: { tenantId }, orderBy: { createdAt: "desc" }, include: { plan: true } });
  if (!subscription) return { ok: false, reason: "لا توجد باقة نشطة" };
  const [users, customers, invoices, whatsappAccounts] = await Promise.all([
    prisma.user.count({ where: { tenantId } }),
    prisma.customer.count({ where: { tenantId } }),
    prisma.invoice.count({ where: { tenantId } }),
    prisma.whatsAppAccount.count({ where: { tenantId } })
  ]);
  return {
    ok: users <= subscription.plan.maxUsers && customers <= subscription.plan.maxCustomers && invoices <= subscription.plan.maxInvoices && whatsappAccounts <= subscription.plan.maxWhatsAppAccounts,
    usage: { users, customers, invoices, whatsappAccounts },
    plan: subscription.plan
  };
}
