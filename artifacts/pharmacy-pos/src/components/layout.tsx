import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useNotifications } from "@/hooks/use-notifications";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  ShoppingCart,
  Pill,
  Package,
  Users,
  History,
  Truck,
  Building2,
  BarChart2,
  LogOut,
  User as UserIcon,
  ClipboardList,
  ShieldCheck,
  Settings,
  Bell,
  Menu,
  X,
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
  { href: "/insurance",     label: "Insurance",     icon: ShieldCheck,     roles: ["admin", "manager", "pharmacist", "super_admin"] },
  { href: "/notifications", label: "Notifications", icon: Bell,            roles: null, showBadge: true },
  { href: "/settings",      label: "Settings",      icon: Settings,        roles: ["admin", "super_admin"] },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const { unreadCount } = useNotifications();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navItems = ALL_NAV.filter(
    (item) => !item.roles || !user?.role || item.roles.includes(user.role)
  );

  const closeSidebar = () => setSidebarOpen(false);

  const sidebarInner = (
    <>
      {/* Logo row */}
      <div className="h-16 flex items-center px-6 border-b border-sidebar-border shrink-0 justify-between">
        <div className="font-bold text-xl text-sidebar-primary">RxPOS</div>
        <button
          className="lg:hidden p-1 rounded-md hover:bg-sidebar-accent text-sidebar-foreground"
          onClick={closeSidebar}
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* User info */}
      {user && (
        <div className="p-4 border-b border-sidebar-border">
          <div className="text-sm font-medium text-sidebar-foreground">{user.name}</div>
          <div className="text-xs text-sidebar-foreground/70 mt-1">
            {user.role} &bull; {user.branch_name || "All Branches"}
          </div>
        </div>
      )}

      {/* Nav */}
      <div className="flex-1 overflow-y-auto py-4 flex flex-col gap-1 px-3">
        {navItems.map((item) => {
          const isActive = location === item.href || location.startsWith(`${item.href}/`);
          const showCount = (item as any).showBadge && unreadCount > 0;
          return (
            <Link key={item.href} href={item.href} onClick={closeSidebar}>
              <div
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md transition-colors cursor-pointer text-sm font-medium",
                  isActive
                    ? "bg-sidebar-primary text-sidebar-primary-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
              >
                <div className="relative shrink-0">
                  <item.icon className="h-4 w-4" />
                  {showCount && (
                    <span className="absolute -top-2 -right-2 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white leading-none">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  )}
                </div>
                <span className="flex-1">{item.label}</span>
                {showCount && (
                  <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[11px] font-semibold text-white">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </div>
            </Link>
          );
        })}
      </div>

      {/* Sign out */}
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
    </>
  );

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden">
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar — drawer on mobile, static on lg+ */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 border-r border-sidebar-border bg-sidebar flex flex-col flex-shrink-0 transition-transform duration-200 ease-in-out",
          "lg:relative lg:z-auto lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {sidebarInner}
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative z-0 min-w-0 max-w-full">
        {/* Mobile top bar */}
        <div className="lg:hidden flex items-center gap-3 h-14 px-4 border-b bg-background shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-1.5 rounded-md hover:bg-accent text-foreground"
          >
            <Menu className="h-5 w-5" />
          </button>
          <span className="font-bold text-base text-primary">RxPOS</span>
        </div>

        <div className="flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-4 lg:p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
