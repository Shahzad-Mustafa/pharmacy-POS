import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { customFetch, useListBranches } from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Printer, Download, X, CheckCircle, TrendingUp, Receipt,
  Banknote, CreditCard, Clock, Building2, Package,
} from "lucide-react";

interface ShiftCloseModalProps {
  open: boolean;
  onClose: () => void;
  date?: string;
  /** pre-select a specific branch (e.g. from Branches page) */
  initialBranchId?: string;
  initialBranchName?: string;
}

// ── helpers ────────────────────────────────────────────────────────────────
function toCSVBlob(rows: (string | number)[][]): Blob {
  return new Blob([rows.map(r => r.map(c => `"${c}"`).join(",")).join("\n")], { type: "text/csv" });
}
function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export function ShiftCloseModal({
  open, onClose, date, initialBranchId, initialBranchName,
}: ShiftCloseModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const today = new Date().toISOString().split("T")[0];
  const reportDate = date ?? today;

  const { data: branchesData } = useListBranches();
  const branches: any[] = Array.isArray(branchesData) ? branchesData : [];

  const defaultBranchId = initialBranchId ?? user?.branch_id ?? "";
  const [selectedBranchId, setSelectedBranchId] = useState(defaultBranchId);
  const [cashInDrawer, setCashInDrawer] = useState("");
  const [notes, setNotes] = useState("");
  const [report, setReport] = useState<any>(null);

  // reset when opened with different branch
  useEffect(() => {
    if (open) {
      setSelectedBranchId(initialBranchId ?? user?.branch_id ?? "");
      setReport(null);
      setCashInDrawer("");
      setNotes("");
    }
  }, [open, initialBranchId]);

  const selectedBranch = branches.find(b => b.id === selectedBranchId);
  const branchLabel = initialBranchName ?? selectedBranch?.name ?? user?.branch_name ?? "Branch";

  // ── Z-report fetch ────────────────────────────────────────────────────────
  const fetchReport = useMutation({
    mutationFn: () =>
      customFetch(`/api/sales/z-report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ branch_id: selectedBranchId, date: reportDate }),
      }) as Promise<any>,
    onSuccess: (data) => setReport(data),
    onError: () => toast({ title: "Failed to load shift report", variant: "destructive" }),
  });

  // ── Inventory fetch (for inventory CSV) ───────────────────────────────────
  const { data: inventoryData, isFetching: inventoryLoading } = useQuery({
    queryKey: ["branch-inventory-export", selectedBranchId],
    queryFn: () => customFetch(`/api/inventory/batches?branch_id=${selectedBranchId}&per_page=500`),
    enabled: false, // only on demand
  });

  // ── Export: Z-Report CSV ──────────────────────────────────────────────────
  const exportZCSV = () => {
    if (!report) return;
    const byPayment = report.by_payment_method ?? {};
    const rows: (string | number)[][] = [
      ["Z-Report / Shift Close", ""],
      ["Date", reportDate],
      ["Branch", branchLabel],
      ["Cashier", user?.name ?? user?.email ?? ""],
      ["Generated At", new Date().toLocaleString("en-PK")],
      ["", ""],
      ["Metric", "Value (Rs.)"],
      ["Total Revenue", Number(report.revenue ?? report.total_revenue ?? 0).toFixed(2)],
      ["Total Transactions", report.transactions ?? report.total_transactions ?? 0],
      ["Tax Collected", Number(report.tax ?? 0).toFixed(2)],
      ["Discounts Given", Number(report.discounts ?? 0).toFixed(2)],
      ["Net Cash", Number(report.net_cash ?? 0).toFixed(2)],
      ["", ""],
      ["Payment Method", "Amount (Rs.)"],
      ...Object.entries(byPayment).map(([m, v]) => [m.charAt(0).toUpperCase() + m.slice(1), Number(v).toFixed(2)]),
      ["", ""],
      ["Cash in Drawer", cashInDrawer || "—"],
      ["Notes", notes || "—"],
    ];
    downloadBlob(toCSVBlob(rows), `z-report-${branchLabel.replace(/\s+/g, "-")}-${reportDate}.csv`);
  };

  // ── Export: Inventory CSV ─────────────────────────────────────────────────
  const exportInventoryCSV = async () => {
    try {
      const data: any = await customFetch(`/api/inventory/batches?branch_id=${selectedBranchId}&per_page=500`);
      const items: any[] = data?.data ?? [];
      const rows: (string | number)[][] = [
        [`Inventory Export — ${branchLabel}`, "", "", "", "", "", ""],
        [`Date: ${reportDate}`, "", "", "", "", "", ""],
        ["", "", "", "", "", "", ""],
        ["#", "Medicine", "Category", "Batch #", "Qty", "Purchase Price (Rs.)", "Selling Price (Rs.)", "Expiry", "Status"],
        ...items.map((b: any, i: number) => {
          const qty = b.quantity ?? 0;
          const exp = b.expiryDate ?? b.expiry_date ?? "";
          const isExpired = exp ? new Date(exp) < new Date() : false;
          const isOut = qty === 0;
          const isLow = !isOut && qty <= (b.reorderPoint ?? b.reorder_point ?? 10);
          const status = isExpired ? "Expired" : isOut ? "Out of Stock" : isLow ? "Low Stock" : "In Stock";
          return [
            i + 1,
            b.medicineName ?? b.medicine_name ?? "",
            b.category ?? "",
            b.batchNumber ?? b.batch_number ?? "",
            qty,
            Number(b.purchasePrice ?? b.purchase_price ?? 0).toFixed(2),
            Number(b.sellingPrice ?? b.selling_price ?? 0).toFixed(2),
            exp,
            status,
          ];
        }),
        ["", "", "", "", "", "", "", "", ""],
        ["Total Batches", items.length, "", "", "", "", "", "", ""],
        ["Total Qty", items.reduce((s: number, b: any) => s + (b.quantity ?? 0), 0), "", "", "", "", "", "", ""],
      ];
      downloadBlob(toCSVBlob(rows), `inventory-${branchLabel.replace(/\s+/g, "-")}-${reportDate}.csv`);
    } catch {
      toast({ title: "Failed to export inventory", variant: "destructive" });
    }
  };

  // ── Print Z-report ────────────────────────────────────────────────────────
  const printReport = () => {
    if (!report) return;
    const byPayment = report.by_payment_method ?? {};
    const html = `<html><head><title>Z-Report ${reportDate}</title>
    <style>body{font-family:'Courier New',monospace;max-width:320px;margin:0 auto;padding:16px;font-size:12px}h2{text-align:center;font-size:16px;margin:0 0 4px}.center{text-align:center}.row{display:flex;justify-content:space-between;padding:3px 0}.divider{border-top:1px dashed #000;margin:6px 0}.bold{font-weight:bold}.big{font-size:18px;font-weight:bold}</style></head>
    <body>
    <h2>★ Z-REPORT ★</h2><p class="center">Shift Close</p>
    <div class="divider"></div>
    <div class="row"><span>Date:</span><span>${reportDate}</span></div>
    <div class="row"><span>Branch:</span><span>${branchLabel}</span></div>
    <div class="row"><span>Cashier:</span><span>${user?.name ?? user?.email ?? ""}</span></div>
    <div class="row"><span>Time:</span><span>${new Date().toLocaleTimeString("en-PK")}</span></div>
    <div class="divider"></div>
    <div class="row bold"><span>TOTAL REVENUE</span><span class="big">Rs. ${Number(report.revenue ?? report.total_revenue ?? 0).toFixed(2)}</span></div>
    <div class="row"><span>Transactions:</span><span>${report.transactions ?? report.total_transactions ?? 0}</span></div>
    <div class="row"><span>Tax Collected:</span><span>Rs. ${Number(report.tax ?? 0).toFixed(2)}</span></div>
    <div class="row"><span>Discounts Given:</span><span>Rs. ${Number(report.discounts ?? 0).toFixed(2)}</span></div>
    <div class="row"><span>Net Cash:</span><span>Rs. ${Number(report.net_cash ?? 0).toFixed(2)}</span></div>
    <div class="divider"></div><p class="bold">PAYMENT BREAKDOWN</p>
    ${Object.entries(byPayment).map(([m, v]) => `<div class="row"><span>${m.charAt(0).toUpperCase() + m.slice(1)}:</span><span>Rs. ${Number(v).toFixed(2)}</span></div>`).join("")}
    ${cashInDrawer ? `<div class="divider"></div><div class="row bold"><span>Cash in Drawer:</span><span>Rs. ${cashInDrawer}</span></div>` : ""}
    ${notes ? `<div class="divider"></div><p>Notes: ${notes}</p>` : ""}
    <div class="divider"></div>
    <p class="center">*** SHIFT CLOSED ***</p>
    <p class="center" style="font-size:10px">Generated by RxPOS</p>
    </body></html>`;
    const w = window.open("", "_blank", "width=400,height=600");
    if (w) { w.document.write(html); w.document.close(); w.print(); }
  };

  const revenue = Number(report?.revenue ?? report?.total_revenue ?? 0);
  const transactions = report?.transactions ?? report?.total_transactions ?? 0;
  const tax = Number(report?.tax ?? 0);
  const discounts = Number(report?.discounts ?? 0);
  const netCash = Number(report?.net_cash ?? 0);
  const byPayment: Record<string, number> = report?.by_payment_method ?? {};
  const paymentIcons: Record<string, any> = { cash: Banknote, card: CreditCard, credit: Receipt };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-lg flex flex-col max-h-[90vh] p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4 shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-emerald-500" />
            Z-Report — Shift Close
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-4">

        {/* ── Branch + Date selectors ── */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">Branch</Label>
            {branches.length > 1 ? (
              <Select value={selectedBranchId} onValueChange={(v) => { setSelectedBranchId(v); setReport(null); }}>
                <SelectTrigger className="h-9">
                  <Building2 className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
                  <SelectValue placeholder="Select branch" />
                </SelectTrigger>
                <SelectContent>
                  {branches.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                </SelectContent>
              </Select>
            ) : (
              <div className="flex items-center gap-2 h-9 px-3 rounded-md border bg-muted/30 text-sm">
                <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                {branchLabel}
              </div>
            )}
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">Date</Label>
            <div className="flex items-center gap-2 h-9 px-3 rounded-md border bg-muted/30 text-sm">
              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
              {reportDate}
            </div>
          </div>
        </div>

        {/* ── Inventory export (always available) ── */}
        <div className="rounded-lg border bg-muted/20 p-3 flex items-center gap-3">
          <Package className="h-5 w-5 text-sky-500 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">Inventory Snapshot</p>
            <p className="text-xs text-muted-foreground">Export current stock levels for {branchLabel}</p>
          </div>
          <Button size="sm" variant="outline" disabled={!selectedBranchId} onClick={exportInventoryCSV}>
            <Download className="h-3.5 w-3.5 mr-1" /> CSV
          </Button>
        </div>

        <Separator />

        {/* ── Z-Report section ── */}
        {fetchReport.isPending ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
          </div>
        ) : !report ? (
          <div className="py-6 text-center space-y-3">
            <Clock className="h-10 w-10 text-muted-foreground mx-auto opacity-50" />
            <p className="text-sm text-muted-foreground">Generate the shift financial summary for <strong>{branchLabel}</strong></p>
            <Button onClick={() => fetchReport.mutate()} disabled={!selectedBranchId}>
              Generate Z-Report
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Branch + cashier pills */}
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="gap-1"><Building2 className="h-3 w-3" />{branchLabel}</Badge>
              <Badge variant="outline">{reportDate}</Badge>
              <Badge variant="secondary" className="ml-auto">{user?.name ?? user?.email}</Badge>
            </div>

            {/* Key metrics */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 p-4 text-center">
                <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium uppercase tracking-wide">Total Revenue</p>
                <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300 mt-1">
                  Rs. {revenue.toLocaleString("en-PK", { maximumFractionDigits: 0 })}
                </p>
              </div>
              <div className="rounded-xl bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800 p-4 text-center">
                <p className="text-xs text-sky-600 dark:text-sky-400 font-medium uppercase tracking-wide">Transactions</p>
                <p className="text-2xl font-bold text-sky-700 dark:text-sky-300 mt-1">{transactions}</p>
              </div>
            </div>

            {/* Detail rows */}
            <div className="rounded-lg border divide-y">
              <div className="flex justify-between px-4 py-2.5 text-sm">
                <span className="text-muted-foreground">Tax Collected</span>
                <span className="font-mono font-medium">Rs. {tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between px-4 py-2.5 text-sm">
                <span className="text-muted-foreground">Discounts Given</span>
                <span className="font-mono font-medium text-orange-600">− Rs. {discounts.toFixed(2)}</span>
              </div>
              <div className="flex justify-between px-4 py-2.5 text-sm font-semibold bg-muted/20">
                <span>Net Cash</span>
                <span className="font-mono text-emerald-600">Rs. {netCash.toFixed(2)}</span>
              </div>
            </div>

            {/* Payment breakdown */}
            {Object.keys(byPayment).length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Payment Breakdown</p>
                <div className="space-y-1.5">
                  {Object.entries(byPayment).map(([method, amount]) => {
                    const Icon = paymentIcons[method] ?? TrendingUp;
                    const pct = revenue > 0 ? (Number(amount) / revenue) * 100 : 0;
                    return (
                      <div key={method} className="rounded-lg bg-muted/40 px-3 py-2 space-y-1">
                        <div className="flex items-center gap-3">
                          <Icon className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm capitalize flex-1">{method}</span>
                          <span className="font-mono text-sm font-medium">Rs. {Number(amount).toFixed(2)}</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                          <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <Separator />

            {/* Cash reconciliation */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Cash in Drawer (Rs.)</Label>
              <Input type="number" placeholder="Enter actual cash counted…" value={cashInDrawer} onChange={e => setCashInDrawer(e.target.value)} />
              {cashInDrawer && (
                <p className={`text-xs font-semibold ${Number(cashInDrawer) >= netCash ? "text-emerald-600" : "text-red-500"}`}>
                  {Number(cashInDrawer) >= netCash
                    ? `✓ Surplus: Rs. ${(Number(cashInDrawer) - netCash).toFixed(2)}`
                    : `⚠ Short by Rs. ${(netCash - Number(cashInDrawer)).toFixed(2)}`}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Notes</Label>
              <Input placeholder="Any notes for this shift…" value={notes} onChange={e => setNotes(e.target.value)} />
            </div>

            {/* Actions */}
            <div className="grid grid-cols-3 gap-2 pt-1">
              <Button variant="outline" onClick={exportZCSV}>
                <Download className="h-4 w-4 mr-1.5" /> Z-Report CSV
              </Button>
              <Button variant="outline" onClick={printReport}>
                <Printer className="h-4 w-4 mr-1.5" /> Print
              </Button>
              <Button variant="outline" onClick={exportInventoryCSV}>
                <Package className="h-4 w-4 mr-1.5" /> Stock CSV
              </Button>
            </div>
          </div>
        )}

        {/* reset / re-generate */}
        {report && (
          <Button variant="ghost" size="sm" className="w-full text-muted-foreground" onClick={() => { setReport(null); fetchReport.mutate(); }}>
            ↺ Re-generate report
          </Button>
        )}

        </div>{/* end scrollable area */}
      </DialogContent>
    </Dialog>
  );
}
