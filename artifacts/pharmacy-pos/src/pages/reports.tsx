import { useState } from "react";
import { BarChart2, Download, Printer, LogOut } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { ShiftCloseModal } from "@/components/shift-close-modal";
import { Button } from "@/components/ui/button";
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

function exportDailyCSV(d: any, date: string, user: any) {
  if (!d) return;
  const byPayment = d.by_payment_method ?? {};
  const rows = [
    ["Daily Summary Report", ""],
    ["Date", date],
    ["Branch", user?.branch_name ?? ""],
    ["Generated", new Date().toLocaleString("en-PK")],
    ["", ""],
    ["Total Revenue (Rs.)", Number(d.total_revenue ?? 0).toFixed(2)],
    ["Total Transactions", d.total_transactions ?? 0],
    ["Tax (Rs.)", Number(d.tax ?? 0).toFixed(2)],
    ["Discounts (Rs.)", Number(d.discounts ?? 0).toFixed(2)],
    ["", ""],
    ["By Payment Method", ""],
    ...Object.entries(byPayment).map(([m, v]) => [m, Number(v).toFixed(2)]),
  ];
  const csv = rows.map(r => r.map(c => `"${c}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = `daily-report-${date}.csv`; a.click();
  URL.revokeObjectURL(url);
}

function printDailySummary(d: any, date: string, user: any) {
  if (!d) return;
  const byPayment = d.by_payment_method ?? {};
  const html = `<html><head><title>Daily Report ${date}</title>
  <style>body{font-family:sans-serif;padding:24px;max-width:600px;margin:auto}h1{font-size:20px;margin-bottom:4px}.sub{color:#666;font-size:13px;margin-bottom:16px}table{width:100%;border-collapse:collapse;margin-top:12px}td,th{padding:8px 12px;text-align:left;border-bottom:1px solid #eee}th{background:#f5f5f5;font-size:12px;text-transform:uppercase;color:#888}.total{font-weight:700;font-size:16px}</style></head>
  <body>
  <h1>Daily Summary Report</h1>
  <p class="sub">Date: ${date} &nbsp;|&nbsp; Branch: ${user?.branch_name ?? ""} &nbsp;|&nbsp; ${new Date().toLocaleString("en-PK")}</p>
  <table><tr><th>Metric</th><th>Value</th></tr>
  <tr><td class="total">Total Revenue</td><td class="total">Rs. ${Number(d.total_revenue ?? 0).toLocaleString("en-PK", { minimumFractionDigits: 2 })}</td></tr>
  <tr><td>Transactions</td><td>${d.total_transactions ?? 0}</td></tr>
  <tr><td>Tax Collected</td><td>Rs. ${Number(d.tax ?? 0).toFixed(2)}</td></tr>
  <tr><td>Discounts Given</td><td>Rs. ${Number(d.discounts ?? 0).toFixed(2)}</td></tr>
  </table>
  ${Object.keys(byPayment).length > 0 ? `<h2 style="font-size:14px;margin-top:20px">By Payment Method</h2><table>
  ${Object.entries(byPayment).map(([m, v]) => `<tr><td style="text-transform:capitalize">${m}</td><td>Rs. ${Number(v).toFixed(2)}</td></tr>`).join("")}
  </table>` : ""}
  </body></html>`;
  const w = window.open("", "_blank", "width=700,height=500");
  if (w) { w.document.write(html); w.document.close(); w.print(); }
}

export default function Reports() {
  const { user } = useAuth();
  const branchId = user?.branch_id ?? undefined;
  const today = new Date().toISOString().split("T")[0];
  const [selectedDate, setSelectedDate] = useState(today);
  const [shiftOpen, setShiftOpen] = useState(false);

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
      <ShiftCloseModal open={shiftOpen} onClose={() => setShiftOpen(false)} date={selectedDate} />

      <PageHeader
        title="Reports"
        subtitle="Analytics and operational summaries"
        icon={BarChart2}
        gradient="from-violet-600 via-purple-500 to-indigo-500"
        actions={
          <Button
            className="bg-white text-violet-700 hover:bg-violet-50 font-semibold"
            onClick={() => setShiftOpen(true)}
          >
            <LogOut className="h-4 w-4 mr-2" /> Close Shift
          </Button>
        }
      />

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
              <div className="flex items-center justify-between flex-wrap gap-2">
                <CardTitle>Daily Summary</CardTitle>
                <div className="flex items-center gap-2 flex-wrap">
                  <Label className="text-sm">Date</Label>
                  <Input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="w-[160px]" data-testid="input-report-date" />
                  <Button size="sm" variant="outline" onClick={() => exportDailyCSV(d, selectedDate, user)} disabled={!d}>
                    <Download className="h-4 w-4 mr-1" /> CSV
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => printDailySummary(d, selectedDate, user)} disabled={!d}>
                    <Printer className="h-4 w-4 mr-1" /> Print
                  </Button>
                  <Button size="sm" onClick={() => setShiftOpen(true)}>
                    <LogOut className="h-4 w-4 mr-1" /> Close Shift
                  </Button>
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
                <div className="overflow-x-auto"><Table>
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
                </Table></div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
