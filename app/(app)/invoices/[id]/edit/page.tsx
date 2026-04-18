import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";

export default function EditInvoicePage() {
  return <><PageHeader title="تعديل الفاتورة" description="تعديل بيانات الفاتورة والربط مع المحصل والعميل." /><Card><p className="text-sm text-muted-foreground">واجهة التعديل التفصيلية جاهزة للتوسعة مع نفس قواعد إنشاء الفاتورة.</p></Card></>;
}
