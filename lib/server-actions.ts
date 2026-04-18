"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { CasePriority, CaseStage, CustomerStatus, InvoiceStatus, RiskLevel, SubscriptionStatus, UserRole, UserStatus } from "@prisma/client";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateCollectionCase, recalculateCustomerBalance, updateInvoiceStatus } from "@/lib/automations";
import { sendSms } from "@/lib/sms/sendSms";
import { sendWhatsApp } from "@/lib/whatsapp/sendWhatsApp";

function value(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

export async function registerTenant(formData: FormData) {
  if (value(formData, "terms") !== "on") throw new Error("يجب قبول الشروط.");
  const plan = await prisma.subscriptionPlan.findUnique({ where: { code: value(formData, "plan") || "starter" } });
  if (!plan) throw new Error("الباقة غير موجودة.");
  const passwordHash = await bcrypt.hash(value(formData, "adminPassword"), 12);
  const trialEndsAt = new Date(Date.now() + 14 * 86400000);
  const tenant = await prisma.tenant.create({
    data: {
      name: value(formData, "companyName"),
      commercialRegistrationNumber: value(formData, "commercialRegistrationNumber"),
      vatNumber: value(formData, "vatNumber"),
      city: value(formData, "city"),
      phone: value(formData, "phone"),
      email: value(formData, "companyEmail"),
      subscriptionPlanId: plan.id,
      subscriptionStatus: SubscriptionStatus.TRIAL,
      trialEndsAt
    }
  });
  const role = await prisma.role.create({ data: { tenantId: tenant.id, name: "مدير الشركة", description: "صلاحيات كاملة للشركة", permissions: { all: true }, systemRole: UserRole.COMPANY_ADMIN } });
  await prisma.user.create({ data: { tenantId: tenant.id, name: value(formData, "adminName"), email: value(formData, "adminEmail").toLowerCase(), passwordHash, phone: value(formData, "phone"), role: UserRole.COMPANY_ADMIN, roleId: role.id, status: UserStatus.ACTIVE } });
  await prisma.tenantSubscription.create({ data: { tenantId: tenant.id, planId: plan.id, status: SubscriptionStatus.TRIAL, trialEndsAt, nextBillingDate: trialEndsAt, amount: plan.monthlyPrice, currency: "SAR" } });
  await prisma.auditLog.create({ data: { tenantId: tenant.id, action: "tenant.register", entityType: "Tenant", entityId: tenant.id, newValue: { plan: plan.code } } });
  redirect("/login?registered=1");
}

export async function createCustomer(formData: FormData) {
  const session = await requireAuth([UserRole.COMPANY_ADMIN, UserRole.COLLECTION_MANAGER, UserRole.ACCOUNTANT]);
  const tenantId = session.user.tenantId;
  if (!tenantId) throw new Error("لا توجد شركة مرتبطة بالمستخدم.");
  await prisma.customer.create({
    data: {
      tenantId,
      name: value(formData, "name"),
      companyName: value(formData, "companyName"),
      customerCode: value(formData, "customerCode"),
      commercialRegistrationNumber: value(formData, "commercialRegistrationNumber"),
      vatNumber: value(formData, "vatNumber"),
      phone: value(formData, "phone"),
      whatsapp: value(formData, "whatsapp"),
      email: value(formData, "email"),
      city: value(formData, "city"),
      address: value(formData, "address"),
      creditLimit: Number(value(formData, "creditLimit") || 0),
      paymentTerms: Number(value(formData, "paymentTerms") || 30),
      riskLevel: (value(formData, "riskLevel") || RiskLevel.MEDIUM) as RiskLevel,
      status: (value(formData, "status") || CustomerStatus.ACTIVE) as CustomerStatus,
      notes: value(formData, "notes")
    }
  });
  revalidatePath("/customers");
  redirect("/customers");
}

export async function createInvoice(formData: FormData) {
  const session = await requireAuth([UserRole.COMPANY_ADMIN, UserRole.COLLECTION_MANAGER, UserRole.ACCOUNTANT]);
  const tenantId = session.user.tenantId;
  if (!tenantId) throw new Error("لا توجد شركة مرتبطة بالمستخدم.");
  const totalAmount = Number(value(formData, "totalAmount") || 0);
  const paidAmount = Number(value(formData, "paidAmount") || 0);
  const dueDate = new Date(value(formData, "dueDate"));
  const remainingAmount = Math.max(0, totalAmount - paidAmount);
  const overdueDays = Math.max(0, Math.floor((Date.now() - dueDate.getTime()) / 86400000));
  const invoice = await prisma.invoice.create({
    data: {
      tenantId,
      customerId: value(formData, "customerId"),
      invoiceNumber: value(formData, "invoiceNumber"),
      invoiceDate: new Date(value(formData, "invoiceDate")),
      dueDate,
      totalAmount,
      paidAmount,
      remainingAmount,
      vatAmount: Number(value(formData, "vatAmount") || totalAmount * 0.15),
      currency: value(formData, "currency") || "SAR",
      status: remainingAmount <= 0 ? InvoiceStatus.PAID : overdueDays > 0 ? InvoiceStatus.OVERDUE : paidAmount > 0 ? InvoiceStatus.PARTIAL : InvoiceStatus.UNPAID,
      overdueDays,
      assignedCollectorId: value(formData, "assignedCollectorId") || null
    }
  });
  await recalculateCustomerBalance(invoice.customerId);
  await generateCollectionCase(invoice.id);
  revalidatePath("/invoices");
  redirect(`/invoices/${invoice.id}`);
}

export async function createCase(formData: FormData) {
  const session = await requireAuth([UserRole.COMPANY_ADMIN, UserRole.COLLECTION_MANAGER]);
  const tenantId = session.user.tenantId;
  if (!tenantId) throw new Error("لا توجد شركة مرتبطة بالمستخدم.");
  const count = await prisma.collectionCase.count({ where: { tenantId } });
  const item = await prisma.collectionCase.create({
    data: {
      tenantId,
      customerId: value(formData, "customerId"),
      invoiceId: value(formData, "invoiceId") || null,
      caseNumber: value(formData, "caseNumber") || `CASE-${new Date().getFullYear()}-${String(count + 1).padStart(5, "0")}`,
      outstandingAmount: Number(value(formData, "outstandingAmount") || 0),
      priority: (value(formData, "priority") || CasePriority.MEDIUM) as CasePriority,
      stage: (value(formData, "stage") || CaseStage.NEW) as CaseStage,
      assignedCollectorId: value(formData, "assignedCollectorId") || null,
      nextFollowUpDate: value(formData, "nextFollowUpDate") ? new Date(value(formData, "nextFollowUpDate")) : null,
      notes: value(formData, "notes")
    }
  });
  revalidatePath("/cases");
  redirect(`/cases/${item.id}`);
}

export async function addCaseActivity(formData: FormData) {
  const session = await requireAuth();
  const caseId = value(formData, "caseId");
  const item = await prisma.collectionCase.findFirst({ where: { id: caseId, tenantId: session.user.tenantId ?? undefined } });
  if (!item) throw new Error("الحالة غير موجودة.");
  await prisma.caseActivity.create({ data: { tenantId: item.tenantId, caseId, userId: session.user.id, type: "INTERNAL_NOTE", summary: value(formData, "summary"), outcome: value(formData, "outcome"), nextActionDate: value(formData, "nextActionDate") ? new Date(value(formData, "nextActionDate")) : null } });
  await prisma.collectionCase.update({ where: { id: caseId }, data: { stage: (value(formData, "stage") || item.stage) as CaseStage, nextFollowUpDate: value(formData, "nextActionDate") ? new Date(value(formData, "nextActionDate")) : item.nextFollowUpDate } });
  revalidatePath(`/cases/${caseId}`);
}

export async function sendDemoSmsAction(formData: FormData) {
  const session = await requireAuth();
  await sendSms({ session, customerId: value(formData, "customerId") || undefined, caseId: value(formData, "caseId") || undefined, recipientPhone: value(formData, "recipientPhone"), messageBody: value(formData, "messageBody") });
  revalidatePath("/sms/messages");
}

export async function sendDemoWhatsAppAction(formData: FormData) {
  const session = await requireAuth();
  await sendWhatsApp({ session, customerId: value(formData, "customerId") || undefined, caseId: value(formData, "caseId") || undefined, recipientPhone: value(formData, "recipientPhone"), messageBody: value(formData, "messageBody") });
  revalidatePath("/whatsapp/messages");
}

export async function updateTenantStatus(formData: FormData) {
  await requireAuth([UserRole.SUPER_ADMIN]);
  await prisma.tenant.update({ where: { id: value(formData, "tenantId") }, data: { subscriptionStatus: value(formData, "status") as SubscriptionStatus } });
  revalidatePath("/admin/tenants");
}

export async function runInvoiceAutomation() {
  const session = await requireAuth([UserRole.SUPER_ADMIN, UserRole.COMPANY_ADMIN, UserRole.COLLECTION_MANAGER]);
  const invoices = await prisma.invoice.findMany({ where: tenantWhere(session), select: { id: true } });
  for (const invoice of invoices) {
    const updated = await updateInvoiceStatus(invoice.id);
    if (updated?.status === InvoiceStatus.OVERDUE) await generateCollectionCase(invoice.id);
  }
  revalidatePath("/dashboard");
}

function tenantWhere(session: Awaited<ReturnType<typeof requireAuth>>) {
  return session.user.role === UserRole.SUPER_ADMIN ? {} : { tenantId: session.user.tenantId ?? "__missing__" };
}
