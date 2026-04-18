import { CasePriority, CaseStage, CustomerStatus, EscalationStatus, InvoiceStatus, MessageStatus, PaymentMethod, PromiseStatus, RiskLevel, SubscriptionStatus, UserStatus, WhatsAppSessionStatus } from "@prisma/client";

export const customerStatusLabels: Record<CustomerStatus, string> = {
  ACTIVE: "نشط",
  ON_HOLD: "موقوف مؤقتًا",
  HIGH_RISK: "مرتفع المخاطر",
  INACTIVE: "غير نشط"
};

export const riskLevelLabels: Record<RiskLevel, string> = {
  LOW: "منخفض",
  MEDIUM: "متوسط",
  HIGH: "مرتفع",
  CRITICAL: "حرج"
};

export const invoiceStatusLabels: Record<InvoiceStatus, string> = {
  PAID: "مدفوعة",
  PARTIAL: "مدفوعة جزئيًا",
  UNPAID: "غير مدفوعة",
  OVERDUE: "متأخرة",
  DISPUTED: "متنازع عليها",
  ESCALATED: "مصعدة"
};

export const caseStageLabels: Record<CaseStage, string> = {
  NEW: "جديدة",
  PENDING_FOLLOW_UP: "بانتظار المتابعة",
  CONTACTED: "تم التواصل",
  PROMISE_TO_PAY: "وعد بالسداد",
  PARTIAL_PAYMENT: "سداد جزئي",
  NO_RESPONSE: "لا يوجد رد",
  DISPUTED: "متنازع عليها",
  ESCALATED: "مصعدة",
  CLOSED_PAID: "مغلقة بالسداد",
  CLOSED_UNCOLLECTIBLE: "مغلقة متعثرة"
};

export const priorityLabels: Record<CasePriority, string> = {
  LOW: "منخفضة",
  MEDIUM: "متوسطة",
  HIGH: "عالية",
  CRITICAL: "حرجة"
};

export const escalationLabels: Record<EscalationStatus, string> = {
  NONE: "لا يوجد",
  MANAGER: "إداري",
  LEGAL: "قانوني",
  EXECUTIVE: "تنفيذي"
};

export const promiseStatusLabels: Record<PromiseStatus, string> = {
  PENDING: "قيد الانتظار",
  KEPT: "ملتزم",
  BROKEN: "متعثر"
};

export const paymentMethodLabels: Record<PaymentMethod, string> = {
  BANK_TRANSFER: "تحويل بنكي",
  SADAD: "سداد",
  CASH: "نقدًا",
  CHEQUE: "شيك",
  CARD: "بطاقة",
  OTHER: "أخرى"
};

export const messageStatusLabels: Record<MessageStatus, string> = {
  DEMO: "وضع تجريبي",
  QUEUED: "في الانتظار",
  SENT: "مرسلة",
  DELIVERED: "تم التسليم",
  FAILED: "فشلت"
};

export const whatsappSessionLabels: Record<WhatsAppSessionStatus, string> = {
  NOT_CONNECTED: "غير متصل",
  QR_PENDING: "بانتظار مسح QR",
  CONNECTED: "متصل",
  EXPIRED: "منتهي",
  DISCONNECTED: "مفصول"
};

export const subscriptionStatusLabels: Record<SubscriptionStatus, string> = {
  TRIAL: "تجربة",
  ACTIVE: "نشط",
  PAST_DUE: "متأخر السداد",
  SUSPENDED: "معلق",
  CANCELLED: "ملغي"
};

export const userStatusLabels: Record<UserStatus, string> = {
  ACTIVE: "نشط",
  INVITED: "مدعو",
  DISABLED: "معطل"
};
