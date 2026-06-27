import { redirect } from "next/navigation";
import AuthenticatedNavbar from "@/components/auth/AuthenticatedNavbar";
import { getSessionFromCookies } from "@/lib/auth";
import { UserType } from "@/lib/enums";
import MobileBottomNav from "@/components/local/dashboard/MobileBottomNav";

const DASHBOARD_WIDE_SHELL_CLASS = "mx-auto w-full max-w-5xl px-4 sm:px-6";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSessionFromCookies();
  if (!session || session.userType !== UserType.LOCAL) {
    redirect("/login");
  }

  return (
    <div className="min-h-dvh">
      <AuthenticatedNavbar logoutEndpoint="/api/auth/logout" />
      <div className="pt-24 pb-[calc(5.5rem+env(safe-area-inset-bottom))] sm:pt-28">
        <div className={DASHBOARD_WIDE_SHELL_CLASS}>{children}</div>
      </div>
      <MobileBottomNav />
    </div>
  );
}
