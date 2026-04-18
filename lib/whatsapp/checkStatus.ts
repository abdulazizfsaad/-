import { WhatsAppSessionStatus } from "@prisma/client";

export async function checkStatus() {
  return process.env.WHATSAPP_QR_PROVIDER_TOKEN ? WhatsAppSessionStatus.CONNECTED : WhatsAppSessionStatus.QR_PENDING;
}
