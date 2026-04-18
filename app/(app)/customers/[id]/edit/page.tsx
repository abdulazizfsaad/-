import { notFound } from "next/navigation";
import { Field, inputClass } from "@/components/form-field";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { requireAuth } from "@/lib/auth";
import { getCustomer } from "@/lib/data";
import { updateCustomer } from "@/lib/server-actions";

export default async function EditCustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireAuth();
  const { id } = await params;
  const customer = await getCustomer(session, id);
  if (!customer) notFound();
  return (
    <>
      <PageHeader title="تعديل العميل" description={customer.companyName} />
      <Card>
        <form action={updateCustomer} className="grid gap-4 md:grid-cols-2">
          <input type="hidden" name="id" value={customer.id} />
          <Field label="اسم المسؤول"><input name="name" defaultValue={customer.name} required className={inputClass} /></Field>
          <Field label="اسم الشركة"><input name="companyName" defaultValue={customer.companyName} required className={inputClass} /></Field>
          <Field label="كود العميل"><input name="customerCode" defaultValue={customer.customerCode} required className={inputClass} /></Field>
          <Field label="السجل التجاري"><input name="commercialRegistrationNumber" defaultValue={customer.commercialRegistrationNumber ?? ""} className={inputClass} /></Field>
          <Field label="الرقم الضريبي"><input name="vatNumber" defaultValue={customer.vatNumber ?? ""} className={inputClass} /></Field>
          <Field label="الهاتف"><input name="phone" defaultValue={customer.phone ?? ""} className={inputClass} /></Field>
          <Field label="واتساب"><input name="whatsapp" defaultValue={customer.whatsapp ?? ""} className={inputClass} /></Field>
          <Field label="البريد"><input name="email" type="email" defaultValue={customer.email ?? ""} className={inputClass} /></Field>
          <Field label="المدينة"><input name="city" defaultValue={customer.city ?? ""} className={inputClass} /></Field>
          <Field label="العنوان"><input name="address" defaultValue={customer.address ?? ""} className={inputClass} /></Field>
          <Field label="حد الائتمان"><input name="creditLimit" type="number" defaultValue={customer.creditLimit.toString()} className={inputClass} /></Field>
          <Field label="شروط السداد"><input name="paymentTerms" type="number" defaultValue={customer.paymentTerms} className={inputClass} /></Field>
          <Field label="مستوى المخاطر"><select name="riskLevel" defaultValue={customer.riskLevel} className={inputClass}><option value="LOW">منخفض</option><option value="MEDIUM">متوسط</option><option value="HIGH">مرتفع</option><option value="CRITICAL">حرج</option></select></Field>
          <Field label="الحالة"><select name="status" defaultValue={customer.status} className={inputClass}><option value="ACTIVE">نشط</option><option value="ON_HOLD">موقوف</option><option value="HIGH_RISK">مرتفع المخاطر</option><option value="INACTIVE">غير نشط</option></select></Field>
          <Field label="ملاحظات"><textarea name="notes" defaultValue={customer.notes ?? ""} className={inputClass} /></Field>
          <button className="self-end rounded-md bg-primary px-4 py-2 font-bold text-white">حفظ التعديلات</button>
        </form>
      </Card>
    </>
  );
}
