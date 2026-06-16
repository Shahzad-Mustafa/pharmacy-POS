import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  ShoppingCart,
  Pill,
  Package,
  Users,
  FileText,
  History,
  Truck,
  Building2,
  Settings,
  LogOut,
  User as UserIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/pos", label: "Point of Sale", icon: ShoppingCart },
  { href: "/prescriptions", label: "Prescriptions", icon: FileText },
  { href: "/medicines", label: "Medicines", icon: Pill },
  { href: "/inventory", label: "Inventory", icon: Package },
  { href: "/patients", label: "Patients", icon: Users },
  { href: "/sales", label: "Sales History", icon: History },
  { href: "/suppliers", label: "Suppliers", icon: Truck },
  { href: "/branches", label: "Branches", icon: Building2 },
  { href: "/users", label: "Staff", icon: UserIcon },
  { href: "/reports", label: "Reports", icon: Settings },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { user, logout } = useAuth();

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 border-r border-sidebar-border bg-sidebar flex flex-col flex-shrink-0">
        <div className="h-16 flex items-center px-6 border-b border-sidebar-border shrink-0">
          <div className="font-bold text-xl text-sidebar-primary">RxPOS</div>
        </div>

        {user && (
          <div className="p-4 border-b border-sidebar-border">
            <div className="text-sm font-medium text-sidebar-foreground">
              {user.name}
            </div>
            <div className="text-xs text-sidebar-foreground/70 mt-1">
              {user.role} &bull; {user.branch_name || "All Branches"}
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto py-4 flex flex-col gap-1 px-3">
          {navItems.map((item) => {
            const isActive = location === item.href || location.startsWith(`${item.href}/`);
            return (
              <Link key={item.href} href={item.href}>
                <div
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-md transition-colors cursor-pointer text-sm font-medium",
                    isActive
                      ? "bg-sidebar-primary text-sidebar-primary-foreground"
                      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </div>
              </Link>
            );
          })}
        </div>

        <div className="p-4 border-t border-sidebar-border shrink-0">
          <Button
            variant="ghost"
            className="w-full justify-start text-sidebar-foreground hover:text-destructive hover:bg-destructive/10"
            onClick={logout}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative z-0">
        <div className="flex-1 overflow-y-auto p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
