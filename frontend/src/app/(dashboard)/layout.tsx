import { AuthGuard } from "@/components/auth-guard";
import { Sidebar } from "@/components/layout/sidebar";
import { TopBar } from "@/components/layout/topbar";
import { AppFooter } from "@/components/layout/app-footer";
import { MobileNav } from "@/components/layout/mobile-nav";
import { DemoLockDialog } from "@/components/demo-lock-dialog";

export default function DashboardGroupLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <div className="layout-shell">
        <Sidebar />
        <div className="layout-main">
          <TopBar />
          <main style={{ flex: 1, overflowY: "auto", paddingBottom: 64 }}>
            {children}
          </main>
        </div>
        {/* Fixed floating footer — outside scroll container */}
        <AppFooter />
        <MobileNav />
        <DemoLockDialog />
      </div>
    </AuthGuard>
  );
}
