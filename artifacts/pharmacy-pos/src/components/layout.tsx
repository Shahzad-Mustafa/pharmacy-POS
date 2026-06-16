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
  BarChart2,
  LogOut,
  User as UserIcon,
  ClipboardList,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const ALL_NAV = [
  { href: "/dashboard",     label: "Dashboard",     icon: LayoutDashboard, roles: ["admin", "manager", "pharmacist", "super_admin"] },
  { href: "/pos",           label: "Point of Sale", icon: ShoppingCart,    roles: null },
  { href: "/prescriptions", label: "Prescriptions", icon: ClipboardList,   roles: ["admin", "manager", "pharmacist", "super_admin"] },
  { href: "/medicines",     label: "Medicines",     icon: Pill,            roles: ["admin", "manager", "pharmacist", "super_admin"] },
  { href: "/inventory",     label: "Inventory",     icon: Package,         roles: ["admin", "manager", "pharmacist", "super_admin"] },
  { href: "/patients",      label: "Patients",      icon: Users,           roles: null },
  { href: "/sales",         label: "Sales History", icon: History,         roles: null },
  { href: "/suppliers",     label: "Suppliers",     icon: Truck,           roles: ["admin", "manager", "super_admin"] },
  { href: "/branches",      label: "Branches",      icon: Building2,       roles: ["admin", "manager", "super_admin"] },
  { href: "/users",         label: "Staff",         icon: UserIcon,        roles: ["admin", "super_admin"] },
  { href: "/reports",       label: "Reports",       icon: BarChart2,       roles: ["admin", "manager", "pharmacist", "super_admin"] },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { user, logout } = useAuth();

  const navItems = ALL_NAV.filter(
    (item) => !item.roles || !user?.role || item.roles.includes(user.role)
  );

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
