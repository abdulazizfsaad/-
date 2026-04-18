export { default } from "next-auth/middleware";

export const config = {
  matcher: ["/dashboard/:path*", "/customers/:path*", "/invoices/:path*", "/cases/:path*", "/payments/:path*", "/promises/:path*", "/reports/:path*", "/settings/:path*", "/users/:path*", "/billing/:path*", "/admin/:path*", "/sms/:path*", "/whatsapp/:path*"]
};
