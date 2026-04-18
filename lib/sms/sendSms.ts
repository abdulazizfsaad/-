import { MessageStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { sendGenericSms } from "@/lib/sms/providers/generic";

type Session = { user: { id: string; tenantId: string | null } };

export async function sendSms(input: { session: Session; customerId?: string; caseId?: string; recipientPhone: string; messageBody: string }) {
  const tenantId = input.session.user.tenantId;
  if (!tenantId) throw new Error("لا توجد شركة مرتبطة بالجلسة.");
  const provider = await prisma.smsProvider.findFirst({ where: { tenantId, isActive: true } });
  const hasCredentials = Boolean(process.env.SMS_API_KEY && process.env.SMS_BASE_URL);
  const result = hasCredentials ? await sendGenericSms(input.recipientPhone, input.messageBody) : { status: MessageStatus.DEMO, providerMessageId: null, errorMessage: "Demo mode: missing SMS credentials" };
  return prisma.smsMessage.create({
    data: {
      tenantId,
      customerId: input.customerId,
      caseId: input.caseId,
      providerId: provider?.id,
      recipientPhone: input.recipientPhone,
      messageBody: input.messageBody,
      status: result.status,
      providerMessageId: result.providerMessageId,
      errorMessage: result.errorMessage,
      sentById: input.session.user.id,
      sentAt: new Date()
    }
  });
}
