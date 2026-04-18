import bcrypt from "bcryptjs";
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { UserRole, UserStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const roleLabels: Record<UserRole, string> = {
  SUPER_ADMIN: "مدير النظام",
  COMPANY_ADMIN: "مدير الشركة",
  COLLECTION_MANAGER: "مدير التحصيل",
  COLLECTOR: "محصل",
  ACCOUNTANT: "محاسب",
  EXECUTIVE_READONLY: "تنفيذي للاطلاع"
};

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    CredentialsProvider({
      name: "Email and password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials.password) return null;
        const user = await prisma.user.findUnique({
          where: { email: credentials.email.toLowerCase() },
          include: { tenant: true }
        });
        if (!user || user.status !== UserStatus.ACTIVE) return null;
        const isValid = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!isValid) return null;
        await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          tenantId: user.tenantId,
          tenantName: user.tenant?.name ?? null
        };
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.tenantId = user.tenantId;
        token.tenantName = user.tenantName;
      }
      return token;
    },
    async session({ session, token }) {
      session.user = {
        id: token.id,
        name: session.user?.name ?? "",
        email: session.user?.email ?? "",
        role: token.role,
        tenantId: token.tenantId,
        tenantName: token.tenantName
      };
      return session;
    }
  }
};

export async function getCurrentSession() {
  return getServerSession(authOptions);
}

export async function requireAuth(allowedRoles?: UserRole[]) {
  const session = await getCurrentSession();
  if (!session) redirect("/login");
  if (allowedRoles && !allowedRoles.includes(session.user.role)) redirect("/dashboard");
  return session;
}

export function tenantScope(session: Awaited<ReturnType<typeof requireAuth>>) {
  if (session.user.role === UserRole.SUPER_ADMIN) return {};
  return { tenantId: session.user.tenantId ?? "__missing_tenant__" };
}
