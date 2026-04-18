import { WhatsAppSessionStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function generateQr(tenantId: string) {
  return prisma.whatsAppAccount.upsert({
    where: { id: "demo-qr-placeholder" },
    create: { tenantId, name: "حساب واتساب QR", provider: process.env.WHATSAPP_PROVIDER || "qr-demo", qrCodeUrl: "/qr-demo.svg", sessionStatus: WhatsAppSessionStatus.QR_PENDING, status: "DEMO" },
    update: { qrCodeUrl: "/qr-demo.svg", sessionStatus: WhatsAppSessionStatus.QR_PENDING }
  });
}
