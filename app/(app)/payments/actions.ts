"use server";

import { revalidatePath } from "next/cache";
import { CaseStage, InvoiceStatus, PaymentMethod, UserRole } from "@prisma/client";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recalculateCustomerBalance } from "@/lib/automations";

export async function addPayment(formData: FormData) {
  const session = await requireAuth([UserRole.SUPER_ADMIN, UserRole.COMPANY_ADMIN, UserRole.COLLECTION_MANAGER, UserRole.ACCOUNTANT]);
  const invoiceId = String(formData.get("invoiceId") ?? "");
  const amount = Number(formData.get("amount") ?? 0);
  const method = String(formData.get("method") ?? "BANK_TRANSFER") as PaymentMethod;
  const referenceNumber = String(formData.get("reference") ?? "");
  const notes = String(formData.get("notes") ?? "");

  if (!invoiceId || !amount || amount <= 0) throw new Error("بيانات الدفعة غير مكتملة.");

  const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId }, include: { customer: true, cases: true } });
  if (!invoice) throw new Error("الفاتورة غير موجودة.");
  if (session.user.role !== UserRole.SUPER_ADMIN && invoice.tenantId !== session.user.tenantId) throw new Error("لا تملك صلاحية على هذه الفاتورة.");

  const currentRemaining = Number(invoice.remainingAmount);
  const allocatedAmount = Math.min(amount, currentRemaining);
  const nextPaid = Number(invoice.paidAmount) + allocatedAmount;
  const nextRemaining = Math.max(0, currentRemaining - allocatedAmount);
  const nextStatus = nextRemaining <= 0 ? InvoiceStatus.PAID : InvoiceStatus.PARTIAL;
  const paymentNumber = `PAY-${new Date().getFullYear()}-${Math.floor(Date.now() / 1000)}`;

  await prisma.$transaction(async (tx) => {
    await tx.payment.create({
      data: {
        tenantId: invoice.tenantId,
        customerId: invoice.customerId,
        invoiceId: invoice.id,
        paymentNumber,
        paymentDate: new Date(),
        amount: allocatedAmount,
        currency: invoice.currency,
        method,
        referenceNumber,
        notes,
        createdById: session.user.id
      }
    });

    await tx.invoice.update({ where: { id: invoice.id }, data: { paidAmount: nextPaid, remainingAmount: nextRemaining, status: nextStatus } });

    if (nextRemaining <= 0) {
      await tx.collectionCase.updateMany({ where: { invoiceId: invoice.id }, data: { stage: CaseStage.CLOSED_PAID, outstandingAmount: 0 } });
    }

    await tx.auditLog.create({
      data: {
        tenantId: invoice.tenantId,
        userId: session.user.id,
        action: "payment.create",
        entityType: "Payment",
        newValue: { invoiceNumber: invoice.invoiceNumber, amount: allocatedAmount }
      }
    });
  });

  await recalculateCustomerBalance(invoice.customerId);
  revalidatePath("/payments");
  revalidatePath("/invoices");
  revalidatePath("/cases");
  revalidatePath("/dashboard");
}
