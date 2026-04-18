import { PageHeader } from "@/components/page-header";
import { Card, CardTitle } from "@/components/ui/card";
import { requireAuth } from "@/lib/auth";
import { getMessageTemplates } from "@/lib/message-templates";
import { saveMessageTemplates } from "@/lib/server-actions";

export default async function MessageTemplatesPage() {
  const session = await requireAuth();
  const templates = await getMessageTemplates(session);

  return (
    <>
      <PageHeader
        title="قوالب الرسائل"
        description="إدارة نصوص SMS وواتساب المستخدمة في التذكير، المتابعة، ومرحلة التصعيد. المتغيرات المدعومة: {customerName} {invoiceNumber} {amount} {dueDate} {promiseDate}."
      />
      <form action={saveMessageTemplates} className="grid gap-4">
        {Object.entries(templates).map(([key, template]) => (
          <Card key={key}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle>{template.title}</CardTitle>
                <p className="mt-2 text-sm text-muted-foreground">القناة: {template.channel}</p>
              </div>
              <span className="rounded-md bg-muted px-3 py-1 text-xs font-bold">{key}</span>
            </div>
            <textarea
              name={key}
              defaultValue={template.body}
              rows={4}
              className="mt-4 w-full rounded-md border border-border px-3 py-2 text-sm leading-7"
            />
          </Card>
        ))}
        <div className="sticky bottom-4 flex justify-end">
          <button className="rounded-md bg-primary px-5 py-3 text-sm font-extrabold text-white shadow-soft">حفظ القوالب</button>
        </div>
      </form>
    </>
  );
}
