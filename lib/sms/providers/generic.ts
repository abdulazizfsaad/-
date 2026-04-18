import { MessageStatus } from "@prisma/client";

export async function sendGenericSms(recipientPhone: string, messageBody: string) {
  if (!process.env.SMS_API_KEY || !process.env.SMS_BASE_URL) {
    return { status: MessageStatus.DEMO, providerMessageId: null, errorMessage: "Demo mode: SMS credentials are not configured" };
  }
  return { status: MessageStatus.QUEUED, providerMessageId: `demo-${Date.now()}-${recipientPhone}`, errorMessage: null };
}
