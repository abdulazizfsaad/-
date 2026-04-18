"use client";

import { useEffect } from "react";
import { signOut } from "next-auth/react";

export default function LogoutPage() {
  useEffect(() => {
    signOut({ callbackUrl: "/login" });
  }, []);
  return <main className="grid min-h-screen place-items-center">جار تسجيل الخروج...</main>;
}
