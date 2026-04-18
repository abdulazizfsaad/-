import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { requireAuth, roleLabels } from "@/lib/auth";
import { getUsers } from "@/lib/data";
import { userStatusLabels } from "@/lib/labels";
import { UserRole } from "@prisma/client";

export default async function UsersPage() {
  const session = await requireAuth([UserRole.SUPER_ADMIN, UserRole.COMPANY_ADMIN]);
  const users = await getUsers(session);
  return (
    <>
      <PageHeader title="المستخدمون والصلاحيات" description="إدارة أدوار الفريق والوصول حسب مسؤوليات التحصيل والمالية والإدارة التنفيذية." />
      <Card className="overflow-x-auto">
        <table className="w-full min-w-[850px] text-sm">
          <thead className="text-muted-foreground"><tr className="border-b border-border text-right"><th className="py-3">الاسم</th><th>البريد</th><th>الهاتف</th><th>الشركة</th><th>الدور</th><th>الحالة</th></tr></thead>
          <tbody>{users.map((user) => <tr key={user.id} className="border-b border-border"><td className="py-3 font-extrabold">{user.name}</td><td>{user.email}</td><td>{user.phone ?? "-"}</td><td>{user.tenant?.name ?? "كل الشركات"}</td><td><Badge tone="info">{roleLabels[user.role]}</Badge></td><td><Badge tone={user.status === "ACTIVE" ? "success" : "danger"}>{userStatusLabels[user.status]}</Badge></td></tr>)}</tbody>
        </table>
      </Card>
    </>
  );
}
