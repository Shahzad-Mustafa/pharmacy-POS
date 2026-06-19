import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  useListBranches,
  getListBranchesQueryKey,
  useCreateBranch,
  useGetBranchStockSummary,
  getGetBranchStockSummaryQueryKey,
  useListBatches,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  Plus, Building2, Package, AlertTriangle, TrendingDown,
  Clock, DollarSign, Layers, MapPin, Phone, Search, LogOut,
} from "lucide-react";
import { ShiftCloseModal } from "@/components/shift-close-modal";

const branchSchema = z.object({
  name: z.string().min(1, "Required"),
  code: z.string().min(1, "Required"),
  address: z.string().optional(),
  phone: z.string().optional(),
  license_number: z.string().optional(),
  tax_rate: z.coerce.number().min(0).max(1).default(0),
});
type BranchForm = z.infer<typeof branchSchema>;

// ── Stat card ──────────────────────────────────────────────────────────────
function StatCard({
  label, value, icon: Icon, gradient, textColor,
}: {
  label: string; value: string | number;
  icon: any; gradient: string; textColor: string;
}) {
  return (
    <div className={`relative overflow-hidden rounded-xl p-4 ${gradient}`}>
      {/* decorative circle */}
      <div className="absolute -right-3 -top-3 h-16 w-16 rounded-full bg-white/10" />
      <div className="absolute -right-1 top-6 h-8 w-8 rounded-full bg-white/10" />
      <div className="relative z-10 flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-white/70 uppercase tracking-wide">{label}</p>
          <p className={`text-2xl font-bold mt-1 ${textColor}`}>{value}</p>
        </div>
        <div className="rounded-lg bg-white/20 p-2">
          <Icon className="h-5 w-5 text-white" />
        </div>
      </div>
    </div>
  );
}

// ── Per-branch stock panel ─────────────────────────────────────────────────
function BranchStockTab({ branch }: { branch: any }) {
  const branchId = branch.id;
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const { data: summaryData, isLoading: summaryLoading } = useGetBranchStockSummary(branchId, {
    query: { queryKey: getGetBranchStockSummaryQueryKey(branchId) },
  });
  const summary = summaryData as any;

  const { data: batchData, isLoading: batchLoading } = useListBatches(
    { branch_id: branchId, page } as any,
    { query: { queryKey: ["batches", branchId, page] } }
  );
  const batches: any[] = (batchData as any)?.data ?? [];
  const totalPages: number = (batchData as any)?.pagination?.pages ?? 1;
  const totalItems: number = (batchData as any)?.pagination?.total ?? 0;

  const filtered = search
    ? batches.filter(b =>
        (b.medicineName ?? b.medicine_name ?? "").toLowerCase().includes(search.toLowerCase()) ||
        (b.batchNumber ?? b.batch_number ?? "").toLowerCase().includes(search.toLowerCase())
      )
    : batches;

  const today = new Date(); today.setHours(0, 0, 0, 0);

  const expiryCell = (exp: string | null) => {
    if (!exp) return <span className="text-muted-foreground text-xs">—</span>;
    const d = new Date(exp); d.setHours(0, 0, 0, 0);
    const diff = Math.floor((d.getTime() - today.getTime()) / 86400000);
    const label = d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" });
    if (diff < 0)   return <Badge variant="destructive" className="text-[10px]">Expired</Badge>;
    if (diff <= 30) return <span className="flex flex-col leading-tight"><span className="text-xs text-red-500 font-medium">{label}</span><span className="text-[10px] text-red-400">{diff}d left</span></span>;
    if (diff <= 90) return <span className="flex flex-col leading-tight"><span className="text-xs text-orange-500 font-medium">{label}</span><span className="text-[10px] text-orange-400">{diff}d left</span></span>;
    return <span className="text-xs text-muted-foreground">{label}</span>;
  };

  const stats = [
    { label: "Total SKUs",     value: summary?.total_skus ?? 0,          icon: Layers,        gradient: "bg-gradient-to-br from-teal-500 to-teal-700",       textColor: "text-white" },
    { label: "Total Batches",  value: summary?.total_batches ?? 0,        icon: Package,       gradient: "bg-gradient-to-br from-sky-500 to-sky-700",         textColor: "text-white" },
    { label: "Stock Value",    value: `Rs. ${Number(summary?.total_value ?? 0).toLocaleString("en-PK", { maximumFractionDigits: 0 })}`, icon: DollarSign, gradient: "bg-gradient-to-br from-emerald-500 to-emerald-700", textColor: "text-white" },
    { label: "Low Stock",      value: summary?.low_stock_count ?? 0,      icon: TrendingDown,  gradient: "bg-gradient-to-br from-amber-400 to-amber-600",     textColor: "text-white" },
    { label: "Expiring Soon",  value: summary?.expiring_soon_count ?? 0,  icon: Clock,         gradient: "bg-gradient-to-br from-orange-500 to-orange-700",   textColor: "text-white" },
    { label: "Out of Stock",   value: summary?.out_of_stock_count ?? 0,   icon: AlertTriangle, gradient: "bg-gradient-to-br from-rose-500 to-rose-700",       textColor: "text-white" },
  ];

  return (
    <div className="space-y-5">
      {/* Stat cards */}
      {summaryLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          {stats.map(s => <StatCard key={s.label} {...s} />)}
        </div>
      )}

      {/* Search bar */}
      <div className="flex items-center gap-3">
        <div className="relative max-w-xs w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search medicine or batch…"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="pl-9"
          />
        </div>
        <span className="text-sm text-muted-foreground ml-auto">{totalItems} batches</span>
      </div>

      {/* Table */}
      <div className="rounded-xl border overflow-hidden shadow-sm overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-8 text-center">#</TableHead>
              <TableHead>Medicine</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Batch #</TableHead>
              <TableHead className="text-right">Qty</TableHead>
              <TableHead className="text-right">Purchase</TableHead>
              <TableHead className="text-right">Selling</TableHead>
              <TableHead>Expiry</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {batchLoading ? (
              [...Array(8)].map((_, i) => (
                <TableRow key={i}>
                  {[...Array(9)].map((_, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}
                </TableRow>
              ))
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="py-20 text-center">
                  <Package className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
                  <p className="text-muted-foreground">No stock records found</p>
                </TableCell>
              </TableRow>
            ) : filtered.map((b: any, idx: number) => {
              const qty = b.quantity ?? 0;
              const expDate = b.expiryDate ?? b.expiry_date ?? null;
              const isExpired = expDate ? new Date(expDate) < today : false;
              const isOut = qty === 0;
              const isLow = !isOut && qty <= (b.reorderPoint ?? b.reorder_point ?? 10);

              return (
                <TableRow
                  key={b.id}
                  className={
                    isExpired || isOut ? "bg-red-50/60 dark:bg-red-950/20" :
                    isLow             ? "bg-amber-50/60 dark:bg-amber-950/20" : ""
                  }
                >
                  <TableCell className="text-center text-xs text-muted-foreground">{(page - 1) * 20 + idx + 1}</TableCell>
                  <TableCell>
                    <p className="font-medium text-sm leading-tight">{b.medicineName ?? b.medicine_name ?? "—"}</p>
                    <p className="text-[10px] text-muted-foreground">{b.genericName ?? b.generic_name ?? ""}</p>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{b.category ?? "—"}</TableCell>
                  <TableCell className="font-mono text-xs">{b.batchNumber ?? b.batch_number ?? "—"}</TableCell>
                  <TableCell className="text-right">
                    <span className={`font-bold text-sm ${isOut ? "text-destructive" : isLow ? "text-amber-600" : "text-foreground"}`}>{qty}</span>
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs text-muted-foreground">
                    {b.purchasePrice ?? b.purchase_price ? `Rs. ${Number(b.purchasePrice ?? b.purchase_price).toFixed(0)}` : "—"}
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs">
                    {b.sellingPrice ?? b.selling_price ? `Rs. ${Number(b.sellingPrice ?? b.selling_price).toFixed(0)}` : "—"}
                  </TableCell>
                  <TableCell>{expiryCell(expDate)}</TableCell>
                  <TableCell>
                    {isExpired ? <Badge variant="destructive"  className="text-[10px]">Expired</Badge>   :
                     isOut     ? <Badge variant="destructive"  className="text-[10px]">Out of Stock</Badge> :
                     isLow     ? <Badge className="text-[10px] bg-amber-500 hover:bg-amber-500">Low Stock</Badge> :
                                 <Badge variant="secondary"    className="text-[10px]">In Stock</Badge>}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <Button size="sm" variant="outline" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
          <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
          <Button size="sm" variant="outline" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
        </div>
      )}
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────
export default function Branches() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("");
  const [shiftBranch, setShiftBranch] = useState<{ id: string; name: string } | null>(null);

  const { data, isLoading } = useListBranches();
  const createBranch = useCreateBranch();
  const branches: any[] = Array.isArray(data) ? data : [];
  const tabValue = activeTab || branches[0]?.id || "";

  const form = useForm<BranchForm>({
    resolver: zodResolver(branchSchema),
    defaultValues: { name: "", code: "", address: "", phone: "", license_number: "", tax_rate: 0 },
  });

  const onSubmit = (values: BranchForm) => {
    createBranch.mutate({ data: values as any }, {
      onSuccess: () => {
        toast({ title: "Branch created" });
        setOpen(false);
        form.reset();
        queryClient.invalidateQueries({ queryKey: getListBranchesQueryKey() });
      },
      onError: () => toast({ title: "Failed to create branch", variant: "destructive" }),
    });
  };

  return (
    <div className="space-y-6">

      <ShiftCloseModal
        open={!!shiftBranch}
        onClose={() => setShiftBranch(null)}
        initialBranchId={shiftBranch?.id}
        initialBranchName={shiftBranch?.name}
      />

      {/* ── Hero header with decorative background ── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-teal-600 via-teal-500 to-emerald-500 p-8 text-white shadow-lg">
        {/* Decorative blobs */}
        <div className="pointer-events-none absolute -top-10 -right-10 h-52 w-52 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute bottom-0 left-1/3 h-40 w-40 rounded-full bg-emerald-300/20 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-6 right-24 h-32 w-32 rounded-full bg-teal-300/20 blur-xl" />
        {/* Dot grid */}
        <div
          className="pointer-events-none absolute inset-0 opacity-10"
          style={{
            backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />
        {/* Content */}
        <div className="relative z-10 flex items-end justify-between gap-3 flex-wrap">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="rounded-xl bg-white/20 p-2.5">
                <Building2 className="h-6 w-6" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Branches</h1>
            </div>
            <p className="text-teal-100 text-xs sm:text-sm">
              {branches.length} branch{branches.length !== 1 ? "es" : ""} registered &mdash; manage locations and monitor stock levels
            </p>
          </div>
          <Button
            onClick={() => setOpen(true)}
            className="bg-white text-teal-700 hover:bg-teal-50 font-semibold shadow-md shrink-0"
          >
            <Plus className="h-4 w-4 mr-2" /> Add Branch
          </Button>
        </div>
      </div>

      {/* ── Branch cards ── */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(2)].map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {branches.map((b: any) => {
            const active = tabValue === b.id;
            return (
              <Card
                key={b.id}
                onClick={() => setActiveTab(b.id)}
                className={`cursor-pointer transition-all duration-200 border-2 hover:shadow-md ${active ? "border-primary shadow-md" : "border-transparent"}`}
              >
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div className={`shrink-0 rounded-xl p-3 ${active ? "bg-primary text-white" : "bg-muted text-muted-foreground"}`}>
                      <Building2 className="h-5 w-5" />
                    </div>
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold">{b.name}</span>
                        <Badge className="text-[10px] font-mono" variant="outline">{b.code}</Badge>
                        <Badge variant={(b.isActive ?? b.is_active) ? "default" : "secondary"} className="text-[10px] ml-auto">
                          {(b.isActive ?? b.is_active) ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                      {b.address && (
                        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                          <MapPin className="h-3 w-3 shrink-0" />{b.address}
                        </p>
                      )}
                      {b.phone && (
                        <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                          <Phone className="h-3 w-3 shrink-0" />{b.phone}
                        </p>
                      )}
                    </div>
                    {/* Tax / DL */}
                    <div className="text-right shrink-0">
                      <p className="text-xs text-muted-foreground">Tax Rate</p>
                      <p className="text-sm font-bold">{(Number(b.taxRate ?? b.tax_rate ?? 0) * 100).toFixed(0)}%</p>
                      {(b.licenseNumber ?? b.license_number) && (
                        <p className="text-[10px] text-muted-foreground mt-0.5">DL: {b.licenseNumber ?? b.license_number}</p>
                      )}
                    </div>
                  </div>
                  {/* Close Shift button */}
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full border-orange-200 text-orange-600 hover:bg-orange-50 hover:border-orange-300"
                    onClick={(e) => { e.stopPropagation(); setShiftBranch({ id: b.id, name: b.name }); }}
                  >
                    <LogOut className="h-3.5 w-3.5 mr-2" /> Close Shift &amp; Export
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* ── Stock table section ── */}
      {branches.length > 0 && (
        <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
          {/* Section header */}
          <div className="relative overflow-hidden px-6 py-4 border-b bg-gradient-to-r from-muted/60 to-muted/20">
            <div className="pointer-events-none absolute right-0 top-0 h-full w-48 bg-gradient-to-l from-primary/5 to-transparent" />
            <div className="flex items-center gap-2">
              <div className="h-4 w-1 rounded-full bg-primary" />
              <h2 className="font-semibold text-base">Stock Overview</h2>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">Live inventory by branch — select a branch above to switch</p>
          </div>

          <div className="p-6">
            <Tabs value={tabValue} onValueChange={setActiveTab}>
              <TabsList className="mb-5">
                {branches.map((b: any) => (
                  <TabsTrigger key={b.id} value={b.id}>{b.name}</TabsTrigger>
                ))}
              </TabsList>
              {branches.map((b: any) => (
                <TabsContent key={b.id} value={b.id}>
                  <BranchStockTab branch={b} />
                </TabsContent>
              ))}
            </Tabs>
          </div>
        </div>
      )}

      {/* ── Add Branch dialog ── */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add Branch</DialogTitle></DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem className="col-span-2"><FormLabel>Branch Name *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="code" render={({ field }) => (
                <FormItem><FormLabel>Branch Code *</FormLabel><FormControl><Input placeholder="e.g. MAIN" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="tax_rate" render={({ field }) => (
                <FormItem><FormLabel>Tax Rate (0–1)</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="phone" render={({ field }) => (
                <FormItem><FormLabel>Phone</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="license_number" render={({ field }) => (
                <FormItem><FormLabel>License Number</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="address" render={({ field }) => (
                <FormItem className="col-span-2"><FormLabel>Address</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <div className="col-span-2 flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={createBranch.isPending}>
                  {createBranch.isPending ? "Creating…" : "Create Branch"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
