"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function LoginForm() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const response = await signIn("credentials", {
      email: form.get("email"),
      password: form.get("password"),
      redirect: false
    });
    setLoading(false);
    if (response?.ok) router.push("/dashboard");
    else setError("بيانات الدخول غير صحيحة أو الحساب غير مفعل.");
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      <label className="grid gap-2 text-sm font-bold">
        البريد الإلكتروني
        <Input name="email" type="email" placeholder="admin@thimar.sa" required />
      </label>
      <label className="grid gap-2 text-sm font-bold">
        كلمة المرور
        <Input name="password" type="password" placeholder="••••••••" required />
      </label>
      {error ? <p className="rounded-md bg-rose-50 p-3 text-sm font-bold text-rose-700">{error}</p> : null}
      <Button disabled={loading}>{loading ? "جار التحقق..." : "دخول المنصة"}</Button>
    </form>
  );
}
