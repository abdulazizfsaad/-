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

export async function registerTenantPublic(formData: FormData) {
  if (value(formData, "terms") !== "on") throw new Error("يجب قبول الشروط.");
  const adminEmail = value(formData, "adminEmail").toLowerCase();
  const companyEmail = value(formData, "companyEmail").toLowerCase();
  const commercialRegistrationNumber = value(formData, "commercialRegistrationNumber");
  const adminPassword = value(formData, "adminPassword");
  if (!adminEmail || !companyEmail || !adminPassword || adminPassword.length < 8) {
    throw new Error("بيانات التسجيل غير مكتملة أو كلمة المرور قصيرة.");
  }
  const [existingUser, existingTenantByCr, existingTenantByEmail] = await Promise.all([
    prisma.user.findUnique({ where: { email: adminEmail } }),
    commercialRegistrationNumber ? prisma.tenant.findFirst({ where: { commercialRegistrationNumber } }) : null,
    prisma.tenant.findFirst({ where: { email: companyEmail } })
  ]);
  if (existingUser) throw new Error("بريد مدير الحساب مستخدم مسبقاً.");
  if (existingTenantByCr) throw new Error("السجل التجاري مسجل مسبقاً.");
  if (existingTenantByEmail) throw new Error("بريد الشركة مسجل مسبقاً.");
  const plan = await prisma.subscriptionPlan.findUnique({ where: { code: value(formData, "plan") || "starter" } });
  if (!plan) throw new Error("الباقة غير موجودة.");
  const passwordHash = await bcrypt.hash(adminPassword, 12);
  const trialEndsAt = new Date(Date.now() + 14 * 86400000);
  await prisma.$transaction(async (tx) => {
    const tenant = await tx.tenant.create({
      data: {
        name: value(formData, "companyName"),
        commercialRegistrationNumber,
        vatNumber: value(formData, "vatNumber"),
        city: value(formData, "city"),
        phone: value(formData, "phone"),
        email: companyEmail,
        subscriptionPlanId: plan.id,
        subscriptionStatus: SubscriptionStatus.TRIAL,
        trialEndsAt
      }
    });
    const role = await tx.role.create({
      data: {
        tenantId: tenant.id,
        name: "مدير الشركة",
        description: "صلاحيات كاملة للشركة",
        permissions: { all: true },
        systemRole: UserRole.COMPANY_ADMIN
      }
    });
    await tx.user.create({
      data: {
        tenantId: tenant.id,
        name: value(formData, "adminName"),
        email: adminEmail,
        passwordHash,
        phone: value(formData, "phone"),
        role: UserRole.COMPANY_ADMIN,
        roleId: role.id,
        status: UserStatus.ACTIVE
      }
    });
    await tx.tenantSubscription.create({
      data: {
        tenantId: tenant.id,
        planId: plan.id,
        status: SubscriptionStatus.TRIAL,
        trialEndsAt,
        nextBillingDate: trialEndsAt,
        amount: plan.monthlyPrice,
        currency: "SAR"
      }
    });
    await tx.auditLog.create({
      data: {
        tenantId: tenant.id,
        action: "tenant.register",
        entityType: "Tenant",
        entityId: tenant.id,
        newValue: { plan: plan.code, source: "public landing" }
      }
    });
  });
  redirect("/login?registered=1");
}

export async function createCustomer(formData: FormData) {
  const session = await requireAuth([UserRole.COMPANY_ADMIN, UserRole.COLLECTION_MANAGER, UserRole.ACCOUNTANT]);
  const tenantId = session.user.tenantId;
  if (!tenantId) throw new Error("لا توجد شركة مرتبطة بالمستخدم.");
  const customerCode = value(formData, "customerCode");
  const duplicate = await prisma.customer.findUnique({ where: { tenantId_customerCode: { tenantId, customerCode } } });
  if (duplicate) throw new Error("كود العميل مستخدم مسبقًا داخل نفس الشركة.");
  await prisma.customer.create({
    data: {
      tenantId,
      name: value(formData, "name"),
      companyName: value(formData, "companyName"),
      customerCode,
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

export async function updateCustomer(formData: FormData) {
  const session = await requireAuth([UserRole.COMPANY_ADMIN, UserRole.COLLECTION_MANAGER, UserRole.ACCOUNTANT]);
  const id = value(formData, "id");
  const customer = await prisma.customer.findFirst({ where: { id, ...tenantWhere(session) } });
  if (!customer) throw new Error("العميل غير موجود أو لا تملك صلاحية تعديله.");
  const customerCode = value(formData, "customerCode");
  if (customerCode !== customer.customerCode) {
    const duplicate = await prisma.customer.findUnique({ where: { tenantId_customerCode: { tenantId: customer.tenantId, customerCode } } });
    if (duplicate) throw new Error("كود العميل مستخدم مسبقًا داخل نفس الشركة.");
  }
  await prisma.customer.update({
    where: { id },
    data: {
      name: value(formData, "name"),
      companyName: value(formData, "companyName"),
      customerCode,
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
  await prisma.auditLog.create({ data: { tenantId: customer.tenantId, userId: session.user.id, action: "customer.update", entityType: "Customer", entityId: id, oldValue: { companyName: customer.companyName }, newValue: { companyName: value(formData, "companyName") } } });
  revalidatePath("/customers");
  revalidatePath(`/customers/${id}`);
  redirect(`/customers/${id}`);
}

export async function deleteCustomer(formData: FormData) {
  const session = await requireAuth([UserRole.COMPANY_ADMIN, UserRole.COLLECTION_MANAGER]);
  const id = value(formData, "id");
  const customer = await prisma.customer.findFirst({ where: { id, ...tenantWhere(session) } });
  if (!customer) throw new Error("العميل غير موجود أو لا تملك صلاحية حذفه.");
  await prisma.customer.update({ where: { id }, data: { status: CustomerStatus.INACTIVE, notes: `${customer.notes ?? ""}\nتم تعطيل العميل بدلاً من حذفه للحفاظ على الأثر المالي والتدقيق.`.trim() } });
  await prisma.auditLog.create({ data: { tenantId: customer.tenantId, userId: session.user.id, action: "customer.deactivate", entityType: "Customer", entityId: id, oldValue: { status: customer.status }, newValue: { status: CustomerStatus.INACTIVE } } });
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
  const customerId = value(formData, "customerId");
  const invoiceNumber = value(formData, "invoiceNumber");
  const [customer, duplicate] = await Promise.all([
    prisma.customer.findFirst({ where: { id: customerId, tenantId } }),
    prisma.invoice.findUnique({ where: { tenantId_invoiceNumber: { tenantId, invoiceNumber } } })
  ]);
  if (!customer) throw new Error("العميل غير موجود أو لا يتبع نفس الشركة.");
  if (duplicate) throw new Error("رقم الفاتورة مستخدم مسبقًا داخل نفس الشركة.");
  const invoice = await prisma.invoice.create({
    data: {
      tenantId,
      customerId,
      invoiceNumber,
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

export async function updateInvoice(formData: FormData) {
  const session = await requireAuth([UserRole.COMPANY_ADMIN, UserRole.COLLECTION_MANAGER, UserRole.ACCOUNTANT]);
  const id = value(formData, "id");
  const invoice = await prisma.invoice.findFirst({ where: { id, ...tenantWhere(session) } });
  if (!invoice) throw new Error("الفاتورة غير موجودة أو لا تملك صلاحية تعديلها.");
  const totalAmount = Number(value(formData, "totalAmount") || 0);
  const paidAmount = Number(value(formData, "paidAmount") || 0);
  const dueDate = new Date(value(formData, "dueDate"));
  const remainingAmount = Math.max(0, totalAmount - paidAmount);
  const overdueDays = Math.max(0, Math.floor((Date.now() - dueDate.getTime()) / 86400000));
  const customerId = value(formData, "customerId");
  const invoiceNumber = value(formData, "invoiceNumber");
  if (invoiceNumber !== invoice.invoiceNumber) {
    const duplicate = await prisma.invoice.findUnique({ where: { tenantId_invoiceNumber: { tenantId: invoice.tenantId, invoiceNumber } } });
    if (duplicate) throw new Error("رقم الفاتورة مستخدم مسبقًا داخل نفس الشركة.");
  }
  const customer = await prisma.customer.findFirst({ where: { id: customerId, tenantId: invoice.tenantId } });
  if (!customer) throw new Error("العميل غير موجود أو لا يتبع نفس الشركة.");
  await prisma.invoice.update({
    where: { id },
    data: {
      customerId,
      invoiceNumber,
      invoiceDate: new Date(value(formData, "invoiceDate")),
      dueDate,
      totalAmount,
      paidAmount,
      remainingAmount,
      vatAmount: Number(value(formData, "vatAmount") || totalAmount * 0.15),
      currency: value(formData, "currency") || "SAR",
      status: (value(formData, "status") || (remainingAmount <= 0 ? InvoiceStatus.PAID : overdueDays > 0 ? InvoiceStatus.OVERDUE : paidAmount > 0 ? InvoiceStatus.PARTIAL : InvoiceStatus.UNPAID)) as InvoiceStatus,
      overdueDays,
      assignedCollectorId: value(formData, "assignedCollectorId") || null
    }
  });
  await recalculateCustomerBalance(invoice.customerId);
  if (invoice.customerId !== customerId) await recalculateCustomerBalance(customerId);
  await updateInvoiceStatus(id);
  await generateCollectionCase(id);
  await prisma.auditLog.create({ data: { tenantId: invoice.tenantId, userId: session.user.id, action: "invoice.update", entityType: "Invoice", entityId: id, oldValue: { invoiceNumber: invoice.invoiceNumber }, newValue: { invoiceNumber } } });
  revalidatePath("/invoices");
  revalidatePath(`/invoices/${id}`);
  redirect(`/invoices/${id}`);
}

export async function deleteInvoice(formData: FormData) {
  const session = await requireAuth([UserRole.COMPANY_ADMIN, UserRole.ACCOUNTANT]);
  const id = value(formData, "id");
  const invoice = await prisma.invoice.findFirst({ where: { id, ...tenantWhere(session) }, include: { payments: true, cases: true } });
  if (!invoice) throw new Error("الفاتورة غير موجودة أو لا تملك صلاحية حذفها.");
  if (invoice.payments.length > 0 || invoice.cases.length > 0) {
    await prisma.invoice.update({ where: { id }, data: { status: InvoiceStatus.ESCALATED } });
    await prisma.auditLog.create({ data: { tenantId: invoice.tenantId, userId: session.user.id, action: "invoice.archive", entityType: "Invoice", entityId: id, newValue: { reason: "Has payments or cases, archived by status" } } });
  } else {
    await prisma.invoice.delete({ where: { id } });
    await prisma.auditLog.create({ data: { tenantId: invoice.tenantId, userId: session.user.id, action: "invoice.delete", entityType: "Invoice", entityId: id } });
  }
  await recalculateCustomerBalance(invoice.customerId);
  revalidatePath("/invoices");
  redirect("/invoices");
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

export async function updateCase(formData: FormData) {
  const session = await requireAuth([UserRole.COMPANY_ADMIN, UserRole.COLLECTION_MANAGER, UserRole.COLLECTOR]);
  const id = value(formData, "id");
  const item = await prisma.collectionCase.findFirst({ where: { id, ...tenantWhere(session) } });
  if (!item) throw new Error("القضية غير موجودة أو لا تملك صلاحية تعديلها.");
  await prisma.collectionCase.update({
    where: { id },
    data: {
      priority: (value(formData, "priority") || item.priority) as CasePriority,
      stage: (value(formData, "stage") || item.stage) as CaseStage,
      assignedCollectorId: formData.has("assignedCollectorId") ? value(formData, "assignedCollectorId") || null : item.assignedCollectorId,
      nextFollowUpDate: value(formData, "nextFollowUpDate") ? new Date(value(formData, "nextFollowUpDate")) : null,
      notes: value(formData, "notes")
    }
  });
  await prisma.auditLog.create({ data: { tenantId: item.tenantId, userId: session.user.id, action: "case.update", entityType: "CollectionCase", entityId: id, oldValue: { stage: item.stage }, newValue: { stage: value(formData, "stage") } } });
  revalidatePath("/cases");
  revalidatePath(`/cases/${id}`);
  redirect(`/cases/${id}`);
}

export async function closeCase(formData: FormData) {
  const session = await requireAuth([UserRole.COMPANY_ADMIN, UserRole.COLLECTION_MANAGER, UserRole.COLLECTOR]);
  const id = value(formData, "id");
  const item = await prisma.collectionCase.findFirst({ where: { id, ...tenantWhere(session) } });
  if (!item) throw new Error("القضية غير موجودة أو لا تملك صلاحية إغلاقها.");
  await prisma.collectionCase.update({ where: { id }, data: { stage: (value(formData, "stage") || CaseStage.CLOSED_UNCOLLECTIBLE) as CaseStage } });
  await prisma.auditLog.create({ data: { tenantId: item.tenantId, userId: session.user.id, action: "case.close", entityType: "CollectionCase", entityId: id, oldValue: { stage: item.stage }, newValue: { stage: value(formData, "stage") } } });
  revalidatePath("/cases");
  redirect("/cases");
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
