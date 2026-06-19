import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";
import {
  useGetDashboardOverview,
  useGetDashboardAlerts,
  useGetTopMedicines,
  useGetRevenueTrend,
  customFetch,
} from "@workspace/api-client-react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
} from "recharts";
import {
  DollarSign, Activity, Users, FileText, AlertTriangle,
  PackageX, Clock, ChevronRight, XCircle, LayoutDashboard,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Skeleton } from "@/components/ui/skeleton";

export default function Dashboard() {
  const { user } = useAuth();
  const branchId = user?.branch_id || undefined;

  const { data: overview, isLoading: loadingOverview } = useGetDashboardOverview(
    branchId ? { branch_id: branchId } : {}
  );
  const { data: alerts, isLoading: loadingAlerts } = useGetDashboardAlerts(
    branchId ? { branch_id: branchId } : {}
  );
  const { data: topMedicines, isLoading: loadingTopMedicines } = useGetTopMedicines(
    branchId ? { branch_id: branchId } : {}
  );
  const { data: trend, isLoading: loadingTrend } = useGetRevenueTrend(
    branchId ? { branch_id: branchId, days: 30 } : { days: 30 }
  );
  const { data: lowStockData } = useQuery({
    queryKey: ["low-stock-list", branchId],
    queryFn: () => customFetch(`/api/medicines/low-stock${branchId ? `?branch_id=${branchId}` : ""}`),
    refetchInterval: 60_000,
  });

  const lowStockItems: any[] = Array.isArray(lowStockData) ? lowStockData : [];
  const outOfStock = lowStockItems.filter((i) => i.current_stock === 0);
  const belowMin = lowStockItems.filter((i) => i.current_stock > 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        subtitle="Overview and key metrics for your pharmacy"
        icon={LayoutDashboard}
        gradient="from-teal-600 via-teal-500 to-emerald-500"
      />

      {/* Critical low-stock banner */}
      {outOfStock.length > 0 && (
        <Link href="/inventory">
          <div className="flex items-center gap-3 p-4 rounded-lg border-2 border-red-400 bg-red-50 dark:bg-red-950/30 cursor-pointer hover:bg-red-100 dark:hover:bg-red-950/50 transition-colors group">
            <XCircle className="h-6 w-6 text-red-500 shrink-0" />
            <div className="flex-1">
              <p className="font-semibold text-red-700 dark:text-red-400">
                {outOfStock.length} product{outOfStock.length > 1 ? "s" : ""} out of stock
              </p>
              <p className="text-sm text-red-600 dark:text-red-400 mt-0.5">
                {outOfStock.slice(0, 3).map((i) => i.name).join(", ")}{outOfStock.length > 3 ? ` +${outOfStock.length - 3} more` : ""}
              </p>
            </div>
            <ChevronRight className="h-5 w-5 text-red-400 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </Link>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Revenue"
          value={overview?.period_revenue ? `Rs. ${overview.period_revenue.toLocaleString()}` : "0"}
          icon={<DollarSign className="w-4 h-4 text-primary" />}
          loading={loadingOverview}
          trend={overview?.revenue_growth_pct}
        />
        <MetricCard
          title="Transactions"
          value={overview?.period_transactions?.toString() || "0"}
          icon={<Activity className="w-4 h-4 text-primary" />}
          loading={loadingOverview}
        />
        <MetricCard
          title="Patients Seen"
          value={overview?.period_patients?.toString() || "0"}
          icon={<Users className="w-4 h-4 text-primary" />}
          loading={loadingOverview}
        />
        <MetricCard
          title="Prescriptions"
          value={overview?.period_prescriptions?.toString() || "0"}
          icon={<FileText className="w-4 h-4 text-primary" />}
          loading={loadingOverview}
        />
      </div>

      {/* Alert Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link href="/inventory">
          <AlertCard
            title="Low Stock Items"
            count={alerts?.low_stock_count || 0}
            icon={<PackageX className="w-5 h-5 text-orange-500" />}
            color="text-orange-500"
            bg="bg-orange-500/10"
            loading={loadingAlerts}
            clickable
            subtitle="Click to view inventory"
          />
        </Link>
        <AlertCard
          title="Expiring Soon"
          count={alerts?.expiring_soon_count || 0}
          icon={<Clock className="w-5 h-5 text-red-500" />}
          color="text-red-500"
          bg="bg-red-500/10"
          loading={loadingAlerts}
        />
        <AlertCard
          title="Pending Rx"
          count={alerts?.pending_prescriptions || 0}
          icon={<FileText className="w-5 h-5 text-blue-500" />}
          color="text-blue-500"
          bg="bg-blue-500/10"
          loading={loadingAlerts}
        />
      </div>

      {/* Low stock details panel */}
      {lowStockItems.length > 0 && (
        <Card className="border-orange-200 dark:border-orange-900">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                <CardTitle className="text-base">
                  {lowStockItems.length} Products Running Low on Stock
                </CardTitle>
              </div>
              <Link href="/inventory">
                <Button size="sm" variant="outline" className="text-orange-600 border-orange-300 hover:bg-orange-50">
                  View All <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {lowStockItems.slice(0, 6).map((item: any) => {
                const isOut = item.current_stock === 0;
                return (
                  <div key={item.id} className="flex items-center gap-3 px-4 py-2.5">
                    <div className={`h-2 w-2 rounded-full shrink-0 ${isOut ? "bg-red-500" : "bg-orange-400"}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.name}</p>
                      <p className="text-xs text-muted-foreground">{item.category}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <Badge
                        variant="outline"
                        className={isOut
                          ? "text-red-600 border-red-300 bg-red-50 dark:bg-red-950"
                          : "text-orange-600 border-orange-300 bg-orange-50 dark:bg-orange-950"
                        }
                      >
                        {isOut ? "Out of Stock" : `${item.current_stock} left`}
                      </Badge>
                    </div>
                  </div>
                );
              })}
              {lowStockItems.length > 6 && (
                <div className="px-4 py-2.5 text-center">
                  <Link href="/inventory">
                    <Button variant="link" size="sm" className="text-orange-600">
                      +{lowStockItems.length - 6} more products — View all
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Revenue Trend (30 Days)</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            {loadingTrend ? (
              <Skeleton className="w-full h-full" />
            ) : trend && trend.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(d) => { const dt = new Date(d + "T00:00:00"); return dt.toLocaleDateString("en-GB", { day: "numeric", month: "short" }); }} />
                  <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `Rs.${v}`} />
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <RechartsTooltip
                    contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))" }}
                    itemStyle={{ color: "hsl(var(--foreground))" }}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorRevenue)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground">No data available</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Medicines</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            {loadingTopMedicines ? (
              <Skeleton className="w-full h-full" />
            ) : topMedicines && topMedicines.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topMedicines} layout="vertical" margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <XAxis type="number" hide />
                  <YAxis dataKey="medicine_name" type="category" fontSize={11} tickLine={false} axisLine={false} width={100} />
                  <RechartsTooltip
                    cursor={{ fill: "hsl(var(--muted))" }}
                    contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))" }}
                  />
                  <Bar dataKey="units_sold" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground">No data available</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MetricCard({ title, value, icon, loading, trend }: any) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <div className="p-2 bg-primary/10 rounded-md">{icon}</div>
        </div>
        <div className="mt-4">
          {loading ? (
            <Skeleton className="h-8 w-24" />
          ) : (
            <h3 className="text-2xl font-bold tracking-tight">{value}</h3>
          )}
          {trend !== undefined && !loading && (
            <p className={`text-xs mt-1 font-medium ${trend >= 0 ? "text-green-600" : "text-destructive"}`}>
              {trend >= 0 ? "+" : ""}{trend}% from last period
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function AlertCard({ title, count, icon, color, bg, loading, clickable, subtitle }: any) {
  return (
    <Card className={clickable ? "cursor-pointer hover:shadow-md transition-shadow" : ""}>
      <CardContent className="p-0 flex items-stretch h-24">
        <div className={`w-24 flex items-center justify-center ${bg}`}>
          {icon}
        </div>
        <div className="flex flex-col justify-center p-4 flex-1">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          {loading ? (
            <Skeleton className="h-8 w-12 mt-1" />
          ) : (
            <h3 className={`text-2xl font-bold tracking-tight ${color}`}>{count}</h3>
          )}
          {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
        {clickable && <div className="flex items-center pr-3"><ChevronRight className="h-4 w-4 text-muted-foreground" /></div>}
      </CardContent>
    </Card>
  );
}
