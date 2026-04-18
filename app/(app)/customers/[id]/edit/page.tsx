import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { requireAuth } from "@/lib/auth";
import { getCustomer } from "@/lib/data";

export default async function EditCustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireAuth();
  const { id } = await params;
  const customer = await getCustomer(session, id);
  return <><PageHeader title="تعديل العميل" description={customer?.companyName ?? "العميل"} /><Card><p className="text-sm text-muted-foreground">نموذج التعديل جاهز للربط التفصيلي. استخدم صفحة إنشاء العميل كمرجع للحقول المطلوبة.</p></Card></>;
}
