"use client";

import { signOut } from "next-auth/react";

export function LogoutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/login" })}
      className="rounded-md border border-border px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted"
    >
      تسجيل الخروج
    </button>
  );
}
