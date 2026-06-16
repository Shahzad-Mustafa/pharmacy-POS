import { useState } from "react";
import {
  useGetDailySummary,
  getGetDailySummaryQueryKey,
  useGetPrescriptionStats,
  getGetPrescriptionStatsQueryKey,
  useGetPayablesAging,
  getGetPayablesAgingQueryKey,
  useGetRevenueTrend,
  getGetRevenueTrendQueryKey,
  useGetTopMedicines,
  getGetTopMedicinesQueryKey,
} from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer
} from "recharts";

export default function Reports() {
  const { user } = useAuth();
  const branchId = user?.branch_id ?? undefined;
  const today = new Date().toISOString().split("T")[0];
  const [selectedDate, setSelectedDate] = useState(today);

  const { data: daily, isLoading: dailyLoading } = useGetDailySummary(
    { branch_id: branchId, date: selectedDate },
    { query: { queryKey: getGetDailySummaryQueryKey({ branch_id: branchId, date: selectedDate }) } }
  );
  const { data: rxStats, isLoading: rxLoading } = useGetPrescriptionStats(
    { branch_id: branchId },
    { query: { queryKey: getGetPrescriptionStatsQueryKey({ branch_id: branchId }) } }
  );
  const { data: aging, isLoading: agingLoading } = useGetPayablesAging(
    { branch_id: branchId },
    { query: { queryKey: getGetPayablesAgingQueryKey({ branch_id: branchId }) } }
  );
  const { data: trend, isLoading: trendLoading } = useGetRevenueTrend(
    { branch_id: branchId, days: 30 },
    { query: { queryKey: getGetRevenueTrendQueryKey({ branch_id: branchId, days: 30 }) } }
  );
  const { data: topMeds, isLoading: topLoading } = useGetTopMedicines(
    { branch_id: branchId, limit: 15 },
    { query: { queryKey: getGetTopMedicinesQueryKey({ branch_id: branchId, limit: 15 }) } }
  );

  const d = daily as any;
  const rx = rxStats as any;
  const agingList = Array.isArray(aging) ? aging : [];
  const trendData = Array.isArray(trend) ? trend : [];
  const topData = Array.isArray(topMeds) ? topMeds : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
        <p className="text-muted-foreground mt-1">Analytics and operational summaries</p>
      </div>

      <Tabs defaultValue="daily">
        <TabsList>
          <TabsTrigger value="daily">Daily Summary</TabsTrigger>
          <TabsTrigger value="revenue">Revenue Trend</TabsTrigger>
          <TabsTrigger value="medicines">Top Medicines</TabsTrigger>
          <TabsTrigger value="prescriptions">Prescriptions</TabsTrigger>
          <TabsTrigger value="payables">Payables Aging</TabsTrigger>
        </TabsList>

        <TabsContent value="daily">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Daily Summary</CardTitle>
                <div className="flex items-center gap-2">
                  <Label className="text-sm">Date</Label>
                  <Input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="w-[160px]" data-testid="input-report-date" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {dailyLoading ? <Skeleton className="h-32 w-full" /> : d ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-4 bg-primary/5 rounded-md">
                      <p className="text-2xl font-bold">Rs. {Number(d.total_revenue ?? 0).toLocaleString()}</p>
                      <p className="text-sm text-muted-foreground">Total Revenue</p>
                    </div>
                    <div className="text-center p-4 bg-primary/5 rounded-md">
                      <p className="text-2xl font-bold">{d.total_transactions ?? 0}</p>
                      <p className="text-sm text-muted-foreground">Transactions</p>
                    </div>
                  </div>
                  {d.by_payment_method && (
                    <div>
                      <p className="text-sm font-semibold mb-2">By Payment Method</p>
                      <div className="space-y-1">
                        {Object.entries(d.by_payment_method).map(([method, amount]) => (
                          <div key={method} className="flex justify-between text-sm border-b pb-1">
                            <span className="capitalize text-muted-foreground">{method}</span>
                            <span className="font-mono font-medium">Rs. {Number(amount).toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : <p className="text-muted-foreground text-sm">No data for selected date</p>}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="revenue">
          <Card>
            <CardHeader><CardTitle>Revenue Trend (Last 30 Days)</CardTitle></CardHeader>
            <CardContent className="h-[400px]">
              {trendLoading ? <Skeleton className="w-full h-full" /> : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="date" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `Rs.${Number(v).toLocaleString()}`} />
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <RechartsTooltip contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))" }} />
                    <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorRev)" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="medicines">
          <Card>
            <CardHeader><CardTitle>Top 15 Medicines by Units Sold</CardTitle></CardHeader>
            <CardContent className="h-[500px]">
              {topLoading ? <Skeleton className="w-full h-full" /> : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topData} layout="vertical" margin={{ top: 0, right: 40, left: 10, bottom: 0 }}>
                    <XAxis type="number" hide />
                    <YAxis dataKey="medicine_name" type="category" fontSize={11} tickLine={false} axisLine={false} width={140} />
                    <RechartsTooltip
                      cursor={{ fill: "hsl(var(--muted))" }}
                      contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))" }}
                    />
                    <Bar dataKey="quantity_sold" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="prescriptions">
          <Card>
            <CardHeader><CardTitle>Prescription Statistics</CardTitle></CardHeader>
            <CardContent>
              {rxLoading ? <Skeleton className="h-32 w-full" /> : rx ? (
                <div className="space-y-4">
                  <div className="text-center p-4 bg-primary/5 rounded-md inline-block">
                    <p className="text-3xl font-bold">{rx.total ?? 0}</p>
                    <p className="text-sm text-muted-foreground">Total Prescriptions</p>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {Object.entries(rx.by_status ?? {}).map(([status, count]) => (
                      <div key={status} className="p-3 border rounded-md text-center">
                        <p className="text-xl font-bold">{String(count)}</p>
                        <p className="text-xs text-muted-foreground capitalize">{status}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : <p className="text-muted-foreground text-sm">No prescription data available</p>}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payables">
          <Card>
            <CardHeader><CardTitle>Payables Aging Report</CardTitle></CardHeader>
            <CardContent className="p-0">
              {agingLoading ? <div className="p-6"><Skeleton className="h-32 w-full" /></div> : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Supplier</TableHead>
                      <TableHead className="text-right">Current</TableHead>
                      <TableHead className="text-right">1-30 Days</TableHead>
                      <TableHead className="text-right">31-60 Days</TableHead>
                      <TableHead className="text-right">61-90 Days</TableHead>
                      <TableHead className="text-right">90+ Days</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {agingList.length === 0 ? (
                      <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground">No payables data</TableCell></TableRow>
                    ) : agingList.map((a: any) => (
                      <TableRow key={a.supplier_id}>
                        <TableCell className="font-medium">{a.supplier_name}</TableCell>
                        <TableCell className="text-right font-mono text-sm">Rs. {Number(a.current ?? 0).toFixed(2)}</TableCell>
                        <TableCell className="text-right font-mono text-sm">Rs. {Number(a.days_1_30 ?? 0).toFixed(2)}</TableCell>
                        <TableCell className="text-right font-mono text-sm">Rs. {Number(a.days_31_60 ?? 0).toFixed(2)}</TableCell>
                        <TableCell className="text-right font-mono text-sm">Rs. {Number(a.days_61_90 ?? 0).toFixed(2)}</TableCell>
                        <TableCell className="text-right font-mono text-sm text-destructive">Rs. {Number(a.over_90 ?? 0).toFixed(2)}</TableCell>
                        <TableCell className="text-right font-mono font-bold">Rs. {Number(a.total ?? 0).toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
