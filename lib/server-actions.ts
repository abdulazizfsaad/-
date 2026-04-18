"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { CasePriority, CaseStage, CustomerStatus, InvoiceStatus, PlanStatus, RiskLevel, SubscriptionStatus, UserRole, UserStatus, WhatsAppSessionStatus } from "@prisma/client";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateCollectionCase, recalculateCustomerBalance, updateInvoiceStatus } from "@/lib/automations";
import { sendSms } from "@/lib/sms/sendSms";
import { sendWhatsApp } from "@/lib/whatsapp/sendWhatsApp";
import { defaultMessageTemplates, type MessageTemplateKey } from "@/lib/message-templates";

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

export async function saveMessageTemplates(formData: FormData) {
  const session = await requireAuth([UserRole.COMPANY_ADMIN, UserRole.COLLECTION_MANAGER]);
  const tenantId = session.user.tenantId;
  if (!tenantId) throw new Error("لا توجد شركة مرتبطة بالمستخدم.");
  const templates = Object.fromEntries(
    (Object.keys(defaultMessageTemplates) as MessageTemplateKey[]).map((key) => [
      key,
      {
        ...defaultMessageTemplates[key],
        body: value(formData, key) || defaultMessageTemplates[key].body
      }
    ])
  );
  await prisma.systemSetting.upsert({
    where: { tenantId_key: { tenantId, key: "message_templates" } },
    create: { tenantId, key: "message_templates", value: templates },
    update: { value: templates }
  });
  await prisma.auditLog.create({
    data: {
      tenantId,
      userId: session.user.id,
      action: "settings.message_templates.update",
      entityType: "SystemSetting",
      entityId: "message_templates",
      newValue: templates
    }
  });
  revalidatePath("/settings/templates");
  redirect("/settings/templates?saved=1");
}

export async function updateTenantStatus(formData: FormData) {
  await requireAuth([UserRole.SUPER_ADMIN]);
  await prisma.tenant.update({ where: { id: value(formData, "tenantId") }, data: { subscriptionStatus: value(formData, "status") as SubscriptionStatus } });
  revalidatePath("/admin/tenants");
}

export async function updateSubscriptionPlan(formData: FormData) {
  const session = await requireAuth([UserRole.SUPER_ADMIN]);
  const id = value(formData, "id");
  const oldPlan = await prisma.subscriptionPlan.findUnique({ where: { id } });
  if (!oldPlan) throw new Error("الباقة غير موجودة.");
  const data = {
    name: value(formData, "name"),
    monthlyPrice: Number(value(formData, "monthlyPrice") || 0),
    yearlyPrice: Number(value(formData, "yearlyPrice") || 0),
    maxUsers: Number(value(formData, "maxUsers") || 1),
    maxCustomers: Number(value(formData, "maxCustomers") || 1),
    maxInvoices: Number(value(formData, "maxInvoices") || 1),
    maxWhatsAppAccounts: Number(value(formData, "maxWhatsAppAccounts") || 0),
    maxSmsPerMonth: Number(value(formData, "maxSmsPerMonth") || 0),
    status: (value(formData, "status") || PlanStatus.ACTIVE) as PlanStatus
  };
  await prisma.subscriptionPlan.update({ where: { id }, data });
  await prisma.auditLog.create({ data: { userId: session.user.id, action: "plan.update", entityType: "SubscriptionPlan", entityId: id, oldValue: { name: oldPlan.name }, newValue: data } });
  revalidatePath("/admin/plans");
}

export async function changeTenantPlan(formData: FormData) {
  const session = await requireAuth([UserRole.SUPER_ADMIN]);
  const tenantId = value(formData, "tenantId");
  const planId = value(formData, "planId");
  const plan = await prisma.subscriptionPlan.findUnique({ where: { id: planId } });
  if (!plan) throw new Error("الباقة غير موجودة.");
  const trialEndsAt = value(formData, "trialEndsAt") ? new Date(value(formData, "trialEndsAt")) : null;
  const nextBillingDate = value(formData, "nextBillingDate") ? new Date(value(formData, "nextBillingDate")) : trialEndsAt;
  const status = (value(formData, "status") || SubscriptionStatus.ACTIVE) as SubscriptionStatus;
  await prisma.$transaction([
    prisma.tenant.update({ where: { id: tenantId }, data: { subscriptionPlanId: plan.id, subscriptionStatus: status, trialEndsAt } }),
    prisma.tenantSubscription.create({ data: { tenantId, planId: plan.id, status, trialEndsAt, nextBillingDate, amount: plan.monthlyPrice, currency: "SAR" } }),
    prisma.auditLog.create({ data: { tenantId, userId: session.user.id, action: "tenant.plan.change", entityType: "Tenant", entityId: tenantId, newValue: { plan: plan.code, status } } })
  ]);
  revalidatePath("/admin/tenants");
  revalidatePath("/billing");
}

export async function updateCompanySettings(formData: FormData) {
  const session = await requireAuth([UserRole.COMPANY_ADMIN, UserRole.SUPER_ADMIN]);
  const tenantId = value(formData, "tenantId") || session.user.tenantId;
  if (!tenantId) throw new Error("لا توجد شركة مرتبطة بالمستخدم.");
  const data = {
    name: value(formData, "name"),
    commercialRegistrationNumber: value(formData, "commercialRegistrationNumber"),
    vatNumber: value(formData, "vatNumber"),
    industry: value(formData, "industry"),
    country: value(formData, "country") || "SA",
    city: value(formData, "city"),
    address: value(formData, "address"),
    phone: value(formData, "phone"),
    email: value(formData, "email"),
    logoUrl: value(formData, "logoUrl")
  };
  await prisma.tenant.update({ where: { id: tenantId }, data });
  await prisma.auditLog.create({ data: { tenantId, userId: session.user.id, action: "tenant.settings.update", entityType: "Tenant", entityId: tenantId, newValue: data } });
  revalidatePath("/settings");
  revalidatePath("/settings/company");
}

export async function savePrintSettings(formData: FormData) {
  const session = await requireAuth([UserRole.COMPANY_ADMIN, UserRole.COLLECTION_MANAGER]);
  const tenantId = session.user.tenantId;
  if (!tenantId) throw new Error("لا توجد شركة مرتبطة بالمستخدم.");
  const valueJson = {
    headerTitle: value(formData, "headerTitle"),
    footerNote: value(formData, "footerNote"),
    showLogo: value(formData, "showLogo") === "on",
    showVat: value(formData, "showVat") === "on",
    showCr: value(formData, "showCr") === "on",
    paperSize: value(formData, "paperSize") || "A4",
    reportSignature: value(formData, "reportSignature")
  };
  await prisma.systemSetting.upsert({
    where: { tenantId_key: { tenantId, key: "print_settings" } },
    create: { tenantId, key: "print_settings", value: valueJson },
    update: { value: valueJson }
  });
  await prisma.auditLog.create({ data: { tenantId, userId: session.user.id, action: "settings.print.update", entityType: "SystemSetting", entityId: "print_settings", newValue: valueJson } });
  revalidatePath("/settings/print");
}

export async function saveCreditPolicy(formData: FormData) {
  const session = await requireAuth([UserRole.COMPANY_ADMIN, UserRole.COLLECTION_MANAGER]);
  const tenantId = session.user.tenantId;
  if (!tenantId) throw new Error("لا توجد شركة مرتبطة بالمستخدم.");
  const policy = {
    softReminderDays: Number(value(formData, "softReminderDays") || 3),
    formalReminderDays: Number(value(formData, "formalReminderDays") || 7),
    managerEscalationDays: Number(value(formData, "managerEscalationDays") || 30),
    legalEscalationDays: Number(value(formData, "legalEscalationDays") || 90),
    creditHoldUtilization: Number(value(formData, "creditHoldUtilization") || 100),
    maxBrokenPromises: Number(value(formData, "maxBrokenPromises") || 1),
    requireManagerApprovalAbove: Number(value(formData, "requireManagerApprovalAbove") || 100000)
  };
  await prisma.systemSetting.upsert({
    where: { tenantId_key: { tenantId, key: "credit_policy" } },
    create: { tenantId, key: "credit_policy", value: policy },
    update: { value: policy }
  });
  await prisma.auditLog.create({ data: { tenantId, userId: session.user.id, action: "settings.credit_policy.update", entityType: "SystemSetting", entityId: "credit_policy", newValue: policy } });
  revalidatePath("/settings/credit-policy");
}

export async function createUserAction(formData: FormData) {
  const session = await requireAuth([UserRole.COMPANY_ADMIN, UserRole.SUPER_ADMIN]);
  const tenantId = value(formData, "tenantId") || session.user.tenantId;
  if (!tenantId && session.user.role !== UserRole.SUPER_ADMIN) throw new Error("لا توجد شركة مرتبطة بالمستخدم.");
  const email = value(formData, "email").toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new Error("البريد الإلكتروني مستخدم مسبقًا.");
  const passwordHash = await bcrypt.hash(value(formData, "password") || "Password123!", 12);
  const user = await prisma.user.create({
    data: {
      tenantId: tenantId || null,
      name: value(formData, "name"),
      email,
      phone: value(formData, "phone"),
      passwordHash,
      role: (value(formData, "role") || UserRole.COLLECTOR) as UserRole,
      status: (value(formData, "status") || UserStatus.ACTIVE) as UserStatus
    }
  });
  await prisma.auditLog.create({ data: { tenantId: tenantId || null, userId: session.user.id, action: "user.create", entityType: "User", entityId: user.id, newValue: { email, role: user.role } } });
  revalidatePath("/users");
  revalidatePath("/settings/users");
}

export async function updateUserStatusAction(formData: FormData) {
  const session = await requireAuth([UserRole.COMPANY_ADMIN, UserRole.SUPER_ADMIN]);
  const id = value(formData, "id");
  const user = await prisma.user.findFirst({ where: { id, ...tenantWhere(session) } });
  if (!user) throw new Error("المستخدم غير موجود أو لا تملك صلاحية تعديله.");
  const data = {
    role: (value(formData, "role") || user.role) as UserRole,
    status: (value(formData, "status") || user.status) as UserStatus
  };
  await prisma.user.update({ where: { id }, data });
  await prisma.auditLog.create({ data: { tenantId: user.tenantId, userId: session.user.id, action: "user.access.update", entityType: "User", entityId: id, oldValue: { role: user.role, status: user.status }, newValue: data } });
  revalidatePath("/users");
  revalidatePath("/settings/users");
}

export async function saveSmsProviderSettings(formData: FormData) {
  const session = await requireAuth([UserRole.COMPANY_ADMIN, UserRole.COLLECTION_MANAGER]);
  const tenantId = session.user.tenantId;
  if (!tenantId) throw new Error("لا توجد شركة مرتبطة بالمستخدم.");
  const providerCode = value(formData, "providerCode") || "generic";
  const data = {
    providerName: value(formData, "providerName") || providerCode,
    providerCode,
    apiBaseUrl: value(formData, "apiBaseUrl"),
    senderName: value(formData, "senderName") || process.env.SMS_SENDER_NAME || "THIMAR",
    isActive: value(formData, "isActive") === "on",
    settingsJson: {
      mode: process.env.SMS_API_KEY ? "live-ready" : "demo",
      apiKeySource: "environment",
      templatesEnabled: true
    }
  };
  await prisma.smsProvider.upsert({
    where: { tenantId_providerCode: { tenantId, providerCode } },
    create: { tenantId, ...data },
    update: data
  });
  await prisma.auditLog.create({ data: { tenantId, userId: session.user.id, action: "integration.sms.update", entityType: "SmsProvider", entityId: providerCode, newValue: { providerCode, senderName: data.senderName, mode: data.settingsJson.mode } } });
  revalidatePath("/settings/integrations/sms");
}

export async function saveWhatsAppAccountSettings(formData: FormData) {
  const session = await requireAuth([UserRole.COMPANY_ADMIN, UserRole.COLLECTION_MANAGER]);
  const tenantId = session.user.tenantId;
  if (!tenantId) throw new Error("لا توجد شركة مرتبطة بالمستخدم.");
  const id = value(formData, "id");
  const sessionStatus = (value(formData, "sessionStatus") || WhatsAppSessionStatus.QR_PENDING) as WhatsAppSessionStatus;
  const data = {
    tenantId,
    name: value(formData, "name") || "حساب واتساب التحصيل",
    phoneNumber: value(formData, "phoneNumber"),
    provider: value(formData, "provider") || "qr-provider",
    status: process.env.WHATSAPP_ACCESS_TOKEN || process.env.WHATSAPP_QR_PROVIDER_TOKEN ? "LIVE_READY" : "DEMO",
    qrCodeUrl: value(formData, "qrCodeUrl") || "/qr-demo.svg",
    sessionStatus,
    lastConnectedAt: sessionStatus === WhatsAppSessionStatus.CONNECTED ? new Date() : null,
    settingsJson: { tokenSource: "environment", mode: process.env.WHATSAPP_ACCESS_TOKEN ? "cloud-api" : "qr-provider" }
  };
  const account = id
    ? await prisma.whatsAppAccount.update({ where: { id }, data })
    : await prisma.whatsAppAccount.create({ data });
  await prisma.auditLog.create({ data: { tenantId, userId: session.user.id, action: "integration.whatsapp.update", entityType: "WhatsAppAccount", entityId: account.id, newValue: { provider: data.provider, sessionStatus } } });
  revalidatePath("/settings/integrations/whatsapp");
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
