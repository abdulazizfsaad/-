import { tenantScope } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Session = Parameters<typeof tenantScope>[0];

export const defaultMessageTemplates = {
  beforeDue: {
    title: "تذكير قبل الاستحقاق",
    channel: "SMS / WhatsApp",
    body: "عميلنا العزيز {customerName}، نذكركم بأن الفاتورة {invoiceNumber} بمبلغ {amount} تستحق بتاريخ {dueDate}. شاكرين تعاونكم."
  },
  overdue: {
    title: "تذكير فاتورة متأخرة",
    channel: "SMS / WhatsApp",
    body: "عميلنا العزيز {customerName}، توجد فاتورة متأخرة رقم {invoiceNumber} بمبلغ {amount}. نأمل السداد أو التواصل مع فريق التحصيل."
  },
  promise: {
    title: "تأكيد وعد السداد",
    channel: "WhatsApp",
    body: "تم تسجيل وعد سداد بمبلغ {amount} بتاريخ {promiseDate}. نشكركم على الالتزام، وسيتم تحديث الحساب بعد السداد."
  },
  followUp: {
    title: "متابعة تحصيل",
    channel: "WhatsApp",
    body: "مرحبًا {customerName}، نتابع معكم حالة الفاتورة {invoiceNumber}. هل يمكن تأكيد موعد السداد المتوقع؟"
  },
  finalNotice: {
    title: "إشعار نهائي قبل التصعيد",
    channel: "SMS / WhatsApp",
    body: "إشعار نهائي: لم يتم سداد الفاتورة {invoiceNumber} حتى الآن. سيتم تصعيد الملف وفق سياسة الائتمان ما لم يتم السداد أو الرد خلال 24 ساعة."
  }
};

export type MessageTemplateKey = keyof typeof defaultMessageTemplates;

export async function getMessageTemplates(session: Session) {
  const scope = tenantScope(session);
  if (!("tenantId" in scope)) return defaultMessageTemplates;
  if (!scope.tenantId) return defaultMessageTemplates;
  const setting = await prisma.systemSetting.findUnique({
    where: { tenantId_key: { tenantId: scope.tenantId, key: "message_templates" } }
  });
  return {
    ...defaultMessageTemplates,
    ...((setting?.value as Partial<typeof defaultMessageTemplates> | null) ?? {})
  };
}
