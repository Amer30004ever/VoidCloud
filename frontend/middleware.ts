import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Role-based access control middleware
const ROLE_ROUTES: Record<string, string[]> = {
  SUPER_ADMIN: ["/admin", "/amercloud/admin"],
  ADMIN: ["/admin", "/amercloud/admin"],
  AGENT: ["/agent"],
  BILLING_MANAGER: ["/admin/billing", "/admin"],
  USER: ["/user", "/amercloud/dashboard", "/business"],
};

const PUBLIC_ROUTES = ["/", "/auth/login", "/auth/register", "/auth/forgot-password", "/auth/reset-password", "/onboarding"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get("voidcloud_token")?.value;
  const userRole = request.cookies.get("voidcloud_role")?.value;

  // Allow public routes
  if (PUBLIC_ROUTES.some(route => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Redirect to login if not authenticated
  if (!token) {
    const loginUrl = new URL("/auth/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Role-based access control
  if (userRole) {
    const allowedRoutes = ROLE_ROUTES[userRole] || [];
    const hasAccess = allowedRoutes.some(route => pathname.startsWith(route));

    if (!hasAccess) {
      // Redirect to appropriate dashboard based on role
      const redirectMap: Record<string, string> = {
        SUPER_ADMIN: "/admin/dashboard",
        ADMIN: "/admin/dashboard",
        AGENT: "/agent/dashboard",
        BILLING_MANAGER: "/admin/billing",
        USER: "/user/dashboard",
      };
      const redirectUrl = redirectMap[userRole] || "/user/dashboard";
      return NextResponse.redirect(new URL(redirectUrl, request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|public).*)",
  ],
};
