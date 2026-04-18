import { MessageStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type Session = { user: { id: string; tenantId: string | null } };

export async function sendWhatsApp(input: { session: Session; customerId?: string; caseId?: string; recipientPhone: string; messageBody: string }) {
  const tenantId = input.session.user.tenantId;
  if (!tenantId) throw new Error("لا توجد شركة مرتبطة بالجلسة.");
  const account = await prisma.whatsAppAccount.findFirst({ where: { tenantId }, orderBy: { createdAt: "desc" } });
  const hasCredentials = Boolean(process.env.WHATSAPP_ACCESS_TOKEN || process.env.WHATSAPP_QR_PROVIDER_TOKEN);
  return prisma.whatsAppMessage.create({
    data: {
      tenantId,
      customerId: input.customerId,
      caseId: input.caseId,
      whatsappAccountId: account?.id,
      recipientPhone: input.recipientPhone,
      messageBody: input.messageBody,
      status: hasCredentials ? MessageStatus.QUEUED : MessageStatus.DEMO,
      errorMessage: hasCredentials ? null : "Demo mode: WhatsApp credentials are not configured",
      providerMessageId: hasCredentials ? `wa-${Date.now()}` : null,
      sentById: input.session.user.id,
      sentAt: new Date()
    }
  });
}
