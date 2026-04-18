import { UserRole } from "@prisma/client";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { requireAuth } from "@/lib/auth";
import { getAuditLogs } from "@/lib/data";
import { formatDate } from "@/lib/utils";

export default async function AuditLogsPage() {
  const session = await requireAuth([UserRole.SUPER_ADMIN, UserRole.COMPANY_ADMIN]);
  const logs = await getAuditLogs(session);
  return (
    <>
      <PageHeader title="سجل التدقيق" description="متابعة تغييرات النظام الحساسة: المستخدمون، الاشتراكات، الإعدادات، العملاء، الفواتير، والقضايا." />
      <Card className="overflow-x-auto">
        <table className="w-full min-w-[980px] text-sm">
          <thead className="text-muted-foreground">
            <tr className="border-b border-border text-right"><th className="py-3">التاريخ</th><th>المستخدم</th><th>الشركة</th><th>الإجراء</th><th>الكيان</th><th>المعرف</th><th>القيمة الجديدة</th></tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id} className="border-b border-border align-top">
                <td className="py-3">{formatDate(log.createdAt)}</td>
                <td>{log.user?.name ?? "-"}</td>
                <td>{log.tenant?.name ?? "النظام"}</td>
                <td><Badge tone="info">{log.action}</Badge></td>
                <td>{log.entityType}</td>
                <td className="max-w-[160px] truncate">{log.entityId ?? "-"}</td>
                <td><pre className="max-w-[360px] whitespace-pre-wrap text-xs text-muted-foreground">{JSON.stringify(log.newValue, null, 2)}</pre></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  );
}
