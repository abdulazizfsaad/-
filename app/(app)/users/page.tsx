import { UserRole, UserStatus } from "@prisma/client";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardTitle } from "@/components/ui/card";
import { requireAuth, roleLabels } from "@/lib/auth";
import { getUsers } from "@/lib/data";
import { userStatusLabels } from "@/lib/labels";
import { createUserAction, updateUserStatusAction } from "@/lib/server-actions";

export default async function UsersPage() {
  const session = await requireAuth([UserRole.SUPER_ADMIN, UserRole.COMPANY_ADMIN]);
  const users = await getUsers(session);
  return (
    <>
      <PageHeader title="المستخدمون والصلاحيات" description="إدارة الفريق، إنشاء مستخدمين، تعطيل الوصول، وتعيين الأدوار حسب مسؤوليات التحصيل والمالية والإدارة التنفيذية." />
      <section className="grid gap-6 xl:grid-cols-[.85fr_1.15fr]">
        <Card>
          <CardTitle>إنشاء مستخدم</CardTitle>
          <form action={createUserAction} className="mt-4 grid gap-3">
            <input name="name" className="rounded-md border border-border px-3 py-2" placeholder="اسم المستخدم" required />
            <input name="email" type="email" className="rounded-md border border-border px-3 py-2" placeholder="البريد الإلكتروني" required />
            <input name="phone" className="rounded-md border border-border px-3 py-2" placeholder="رقم الجوال" />
            <input name="password" type="password" className="rounded-md border border-border px-3 py-2" placeholder="كلمة المرور الافتراضية" />
            <select name="role" className="rounded-md border border-border px-3 py-2" defaultValue={UserRole.COLLECTOR}>
              {Object.values(UserRole).filter((role) => session.user.role === UserRole.SUPER_ADMIN || role !== UserRole.SUPER_ADMIN).map((role) => <option key={role} value={role}>{roleLabels[role]}</option>)}
            </select>
            <select name="status" className="rounded-md border border-border px-3 py-2" defaultValue={UserStatus.ACTIVE}>
              <option value="ACTIVE">نشط</option><option value="INVITED">مدعو</option><option value="DISABLED">معطل</option>
            </select>
            <button className="rounded-md bg-primary px-4 py-2 font-extrabold text-white">إضافة المستخدم</button>
          </form>
        </Card>
        <Card className="overflow-x-auto">
          <CardTitle>قائمة المستخدمين</CardTitle>
          <table className="mt-4 w-full min-w-[900px] text-sm">
            <thead className="text-muted-foreground">
              <tr className="border-b border-border text-right"><th className="py-3">الاسم</th><th>البريد</th><th>الهاتف</th><th>الشركة</th><th>الدور</th><th>الحالة</th><th>تعديل الوصول</th></tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b border-border align-top">
                  <td className="py-3 font-extrabold">{user.name}</td>
                  <td>{user.email}</td>
                  <td>{user.phone ?? "-"}</td>
                  <td>{user.tenant?.name ?? "كل الشركات"}</td>
                  <td><Badge tone="info">{roleLabels[user.role]}</Badge></td>
                  <td><Badge tone={user.status === "ACTIVE" ? "success" : "danger"}>{userStatusLabels[user.status]}</Badge></td>
                  <td>
                    <form action={updateUserStatusAction} className="flex gap-2">
                      <input type="hidden" name="id" value={user.id} />
                      <select name="role" defaultValue={user.role} className="rounded-md border px-2 py-1">
                        {Object.values(UserRole).filter((role) => session.user.role === UserRole.SUPER_ADMIN || role !== UserRole.SUPER_ADMIN).map((role) => <option key={role} value={role}>{roleLabels[role]}</option>)}
                      </select>
                      <select name="status" defaultValue={user.status} className="rounded-md border px-2 py-1">
                        <option value="ACTIVE">نشط</option><option value="INVITED">مدعو</option><option value="DISABLED">معطل</option>
                      </select>
                      <button className="rounded-md bg-primary px-3 py-1 text-white">حفظ</button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </section>
    </>
  );
}
