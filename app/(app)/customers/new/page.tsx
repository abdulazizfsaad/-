import { Field, inputClass } from "@/components/form-field";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { createCustomer } from "@/lib/server-actions";

export default function NewCustomerPage() {
  return (
    <>
      <PageHeader title="عميل جديد" description="إضافة عميل مع بيانات الفوترة والمخاطر والحد الائتماني." />
      <Card><form action={createCustomer} className="grid gap-4 md:grid-cols-2">
        <Field label="اسم المسؤول"><input name="name" required className={inputClass} /></Field>
        <Field label="اسم الشركة"><input name="companyName" required className={inputClass} /></Field>
        <Field label="كود العميل"><input name="customerCode" required className={inputClass} /></Field>
        <Field label="السجل التجاري"><input name="commercialRegistrationNumber" className={inputClass} /></Field>
        <Field label="الرقم الضريبي"><input name="vatNumber" className={inputClass} /></Field>
        <Field label="الهاتف"><input name="phone" className={inputClass} /></Field>
        <Field label="واتساب"><input name="whatsapp" className={inputClass} /></Field>
        <Field label="البريد"><input name="email" type="email" className={inputClass} /></Field>
        <Field label="المدينة"><input name="city" className={inputClass} /></Field>
        <Field label="العنوان"><input name="address" className={inputClass} /></Field>
        <Field label="حد الائتمان"><input name="creditLimit" type="number" className={inputClass} /></Field>
        <Field label="شروط السداد"><input name="paymentTerms" type="number" defaultValue="30" className={inputClass} /></Field>
        <Field label="مستوى المخاطر"><select name="riskLevel" className={inputClass}><option value="LOW">منخفض</option><option value="MEDIUM">متوسط</option><option value="HIGH">مرتفع</option><option value="CRITICAL">حرج</option></select></Field>
        <Field label="الحالة"><select name="status" className={inputClass}><option value="ACTIVE">نشط</option><option value="ON_HOLD">موقوف</option><option value="HIGH_RISK">مرتفع المخاطر</option><option value="INACTIVE">غير نشط</option></select></Field>
        <Field label="ملاحظات"><textarea name="notes" className={inputClass} /></Field>
        <button className="self-end rounded-md bg-primary px-4 py-2 font-bold text-white">حفظ العميل</button>
      </form></Card>
    </>
  );
}
