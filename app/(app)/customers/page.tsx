import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { requireAuth } from "@/lib/auth";
import { getCustomers } from "@/lib/data";
import { customerStatusLabels, riskLevelLabels } from "@/lib/labels";
import { formatMoney } from "@/lib/utils";

export default async function CustomersPage() {
  const session = await requireAuth();
  const customers = await getCustomers(session);
  return (
    <>
      <PageHeader title="العملاء" description="سجل العملاء، الحدود الائتمانية، أرصدة الذمم، ومؤشرات المخاطر." action={<Link href="/customers/new" className="rounded-md bg-primary px-4 py-2 text-sm font-bold text-white">إضافة عميل</Link>} />
      <Card className="overflow-x-auto">
        <div className="mb-4 flex flex-wrap gap-3">
          <input className="w-full max-w-sm rounded-md border border-border px-3 py-2 text-sm" placeholder="بحث باسم العميل أو الرقم الضريبي" />
          <select className="rounded-md border border-border px-3 py-2 text-sm"><option>كل الحالات</option></select>
        </div>
        <table className="w-full min-w-[920px] text-sm">
          <thead className="text-muted-foreground">
            <tr className="border-b border-border text-right">
              <th className="py-3">كود العميل</th><th>اسم العميل</th><th>الشركة</th><th>المدينة</th><th>الهاتف</th><th>حد الائتمان</th><th>الرصيد الحالي</th><th>المخاطر</th><th>الحالة</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((customer) => (
              <tr key={customer.id} className="border-b border-border">
                <td className="py-3 font-bold"><Link className="text-primary" href={`/customers/${customer.id}`}>{customer.customerCode}</Link></td>
                <td>{customer.name}</td>
                <td>{customer.companyName}</td>
                <td>{customer.city}</td>
                <td>{customer.phone}</td>
                <td>{formatMoney(customer.creditLimit.toString())}</td>
                <td className="font-extrabold">{formatMoney(customer.outstandingBalance.toString())}</td>
                <td><Badge tone={customer.riskLevel === "CRITICAL" || customer.riskLevel === "HIGH" ? "danger" : "info"}>{riskLevelLabels[customer.riskLevel]}</Badge></td>
                <td><Badge tone={customer.status === "HIGH_RISK" ? "danger" : "success"}>{customerStatusLabels[customer.status]}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  );
}
