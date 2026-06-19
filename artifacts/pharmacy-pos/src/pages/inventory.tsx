import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  useGetInventoryOverview,
  getGetInventoryOverviewQueryKey,
  useListBatches,
  getListBatchesQueryKey,
  useCreateBatch,
  useCreateStockAdjustment,
  useGetStockValuation,
  getGetStockValuationQueryKey,
  useGetReorderSuggestions,
  getGetReorderSuggestionsQueryKey,
  useSearchMedicines,
  useListBranches,
  useCreateMedicine,
  getListMedicinesQueryKey,
  customFetch,
} from "@workspace/api-client-react";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Package, AlertTriangle, TrendingUp, Plus, MoreVertical, PencilLine, SlidersHorizontal } from "lucide-react";
import { PageHeader } from "@/components/page-header";

const batchSchema = z.object({
  medicine_id: z.string().min(1, "Required"),
  branch_id: z.string().min(1, "Required"),
  batch_number: z.string().min(1, "Required"),
  expiry_date: z.string().min(1, "Required"),
  quantity: z.coerce.number().min(1),
  purchase_price: z.coerce.number().min(0),
  selling_price: z.coerce.number().min(0),
});

const adjustSchema = z.object({
  batch_id: z.string().min(1, "Required"),
  branch_id: z.string().min(1, "Required"),
  adjustment_type: z.string().min(1, "Required"),
  quantity_change: z.coerce.number(),
  reason: z.string().min(1, "Required"),
});

type BatchForm = z.infer<typeof batchSchema>;
type AdjustForm = z.infer<typeof adjustSchema>;

function MedicineSearch({ value, onChange }: { value: string; onChange: (id: string, name: string) => void }) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [selectedName, setSelectedName] = useState("");
  const [quickCreate, setQuickCreate] = useState(false);
  const [newMedName, setNewMedName] = useState("");
  const [newMedMrp, setNewMedMrp] = useState("0");
  const [newMedCategory, setNewMedCategory] = useState("");
  const createMed = useCreateMedicine();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data } = useSearchMedicines(
    { q: search },
    { query: { enabled: search.length >= 2, queryKey: ["inv-med-search", search] } }
  );
  const results = Array.isArray(data) ? data : (data as any)?.data ?? [];

  const handleSelect = (med: any) => {
    onChange(med.id, med.name);
    setSelectedName(med.name);
    setOpen(false);
    setSearch("");
  };

  const openQuickCreate = () => {
    setNewMedName(search);
    setNewMedMrp("0");
    setNewMedCategory("");
    setQuickCreate(true);
    setOpen(false);
  };

  const handleQuickCreate = () => {
    if (!newMedName.trim()) return;
    createMed.mutate(
      { data: { name: newMedName.trim(), mrp: Number(newMedMrp) || 0, category: newMedCategory || undefined, requires_prescription: false } as any },
      {
        onSuccess: (med: any) => {
          onChange(med.id, med.name);
          setSelectedName(med.name);
          setQuickCreate(false);
          setSearch("");
          queryClient.invalidateQueries({ queryKey: getListMedicinesQueryKey() });
          toast({ title: `Medicine "${med.name}" created` });
        },
        onError: () => toast({ title: "Failed to create medicine", variant: "destructive" }),
      }
    );
  };

  return (
    <>
      <div className="relative">
        {selectedName ? (
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium flex-1 border rounded-md px-3 py-2 bg-muted">{selectedName}</span>
            <Button type="button" size="sm" variant="ghost" onClick={() => { onChange("", ""); setSelectedName(""); }}>×</Button>
          </div>
        ) : (
          <div>
            <Input
              placeholder="Type to search or create medicine..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setOpen(true); }}
              onFocus={() => setOpen(true)}
              onBlur={() => setTimeout(() => setOpen(false), 200)}
              data-testid="input-medicine-search-batch"
            />
            {open && search.length >= 2 && (
              <div className="absolute z-50 w-full mt-1 bg-card border rounded-md shadow-lg max-h-56 overflow-y-auto">
                {results.slice(0, 8).map((med: any) => (
                  <div
                    key={med.id}
                    className="px-3 py-2 hover:bg-accent cursor-pointer text-sm"
                    onMouseDown={() => handleSelect(med)}
                  >
                    <span className="font-medium">{med.name}</span>
                    {med.generic_name && <span className="text-muted-foreground ml-2 text-xs">({med.generic_name})</span>}
                    <span className="text-xs text-muted-foreground ml-2">{med.category}</span>
                  </div>
                ))}
                <div
                  className="px-3 py-2 hover:bg-accent cursor-pointer text-sm border-t flex items-center gap-2 text-primary font-medium"
                  onMouseDown={openQuickCreate}
                >
                  <Plus className="h-3 w-3" />
                  Create new medicine: "{search}"
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Quick-create medicine dialog */}
      <Dialog open={quickCreate} onOpenChange={setQuickCreate}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Add New Medicine</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">Name *</label>
              <Input value={newMedName} onChange={(e) => setNewMedName(e.target.value)} className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium">Category</label>
              <Input value={newMedCategory} onChange={(e) => setNewMedCategory(e.target.value)} placeholder="e.g. Antibiotics" className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium">MRP (Rs.) *</label>
              <Input type="number" value={newMedMrp} onChange={(e) => setNewMedMrp(e.target.value)} className="mt-1" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setQuickCreate(false)}>Cancel</Button>
              <Button type="button" onClick={handleQuickCreate} disabled={createMed.isPending || !newMedName.trim()}>
                {createMed.isPending ? "Creating..." : "Create & Select"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function Inventory() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [batchOpen, setBatchOpen] = useState(false);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const [priceOpen, setPriceOpen] = useState(false);
  const [editingBatch, setEditingBatch] = useState<any>(null);
  const [priceForm, setPriceForm] = useState({ purchase_price: "", selling_price: "" });

  const branchId = user?.branch_id ?? undefined;

  const { data: overview, isLoading: ovLoading } = useGetInventoryOverview(
    { branch_id: branchId },
    { query: { queryKey: getGetInventoryOverviewQueryKey({ branch_id: branchId }) } }
  );
  const { data: batches, isLoading: batchLoading } = useListBatches(
    { branch_id: branchId, page, per_page: perPage } as any,
    { query: { queryKey: getListBatchesQueryKey({ branch_id: branchId, page, per_page: perPage } as any) } }
  );
  const { data: valuation } = useGetStockValuation(
    { branch_id: branchId },
    { query: { queryKey: getGetStockValuationQueryKey({ branch_id: branchId }) } }
  );
  const { data: reorder } = useGetReorderSuggestions(
    { branch_id: branchId },
    { query: { queryKey: getGetReorderSuggestionsQueryKey({ branch_id: branchId }) } }
  );

  const { data: branchesData } = useListBranches();
  const branchList = Array.isArray(branchesData) ? branchesData : [];

  const createBatch = useCreateBatch();
  const createAdjustment = useCreateStockAdjustment();
  const updateBatchPrice = useMutation({
    mutationFn: ({ batchId, data }: { batchId: string; data: any }) =>
      customFetch(`/api/inventory/batches/${batchId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      toast({ title: "Prices updated" });
      setPriceOpen(false);
      queryClient.invalidateQueries({ queryKey: getListBatchesQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetStockValuationQueryKey() });
    },
    onError: () => toast({ title: "Failed to update prices", variant: "destructive" }),
  });

  const batchForm = useForm<BatchForm>({
    resolver: zodResolver(batchSchema),
    defaultValues: { branch_id: branchId ?? "", quantity: 1, purchase_price: 0, selling_price: 0 },
  });

  const adjustForm = useForm<AdjustForm>({
    resolver: zodResolver(adjustSchema),
    defaultValues: { branch_id: branchId ?? "", adjustment_type: "correction" },
  });

  const onBatchSubmit = (values: BatchForm) => {
    createBatch.mutate({ data: values as any }, {
      onSuccess: () => {
        toast({ title: "Batch created" });
        setBatchOpen(false);
        queryClient.invalidateQueries({ queryKey: getListBatchesQueryKey() });
        batchForm.reset();
      },
      onError: () => toast({ title: "Failed to create batch", variant: "destructive" }),
    });
  };

  const onAdjustSubmit = (values: AdjustForm) => {
    createAdjustment.mutate({ data: { ...values, batch_id: selectedBatchId ?? values.batch_id } as any }, {
      onSuccess: () => {
        toast({ title: "Adjustment recorded" });
        setAdjustOpen(false);
        queryClient.invalidateQueries({ queryKey: getListBatchesQueryKey() });
        adjustForm.reset();
      },
      onError: () => toast({ title: "Failed to adjust stock", variant: "destructive" }),
    });
  };

  const batchData = (batches as any)?.data ?? [];
  const totalBatches = (batches as any)?.pagination?.total ?? (batches as any)?.total ?? 0;
  const totalPages = (batches as any)?.pagination?.pages ?? (batches as any)?.total_pages ?? 1;
  const v = valuation as any;
  const reorderItems = Array.isArray(reorder) ? reorder : [];
  const overviewItems = Array.isArray(overview) ? overview : [];

  const now = new Date().toISOString().split("T")[0];
  const threshold = new Date();
  threshold.setDate(threshold.getDate() + 90);
  const thresholdStr = threshold.toISOString().split("T")[0];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inventory"
        subtitle="Stock levels, batches, and adjustments"
        icon={Package}
        gradient="from-sky-600 via-sky-500 to-teal-500"
        actions={
          <>
            <Button variant="outline" className="bg-white/20 border-white/30 text-white hover:bg-white/30" onClick={() => { setAdjustOpen(true); setSelectedBatchId(null); }} data-testid="button-adjust-stock">
              <AlertTriangle className="h-4 w-4 mr-2" /> Adjust Stock
            </Button>
            <Button className="bg-white text-sky-700 hover:bg-sky-50 font-semibold" onClick={() => setBatchOpen(true)} data-testid="button-add-batch">
              <Plus className="h-4 w-4 mr-2" /> Add Batch
            </Button>
          </>
        }
      />

      {/* Valuation cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-md"><Package className="h-5 w-5 text-primary" /></div>
            <div>
              <p className="text-xs text-muted-foreground">Cost Value</p>
              <p className="text-xl font-bold" data-testid="text-cost-value">Rs. {Number(v?.total_cost_value ?? 0).toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-md"><TrendingUp className="h-5 w-5 text-primary" /></div>
            <div>
              <p className="text-xs text-muted-foreground">Retail Value</p>
              <p className="text-xl font-bold">Rs. {Number(v?.total_retail_value ?? 0).toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-md"><Package className="h-5 w-5 text-primary" /></div>
            <div>
              <p className="text-xs text-muted-foreground">Total Units</p>
              <p className="text-xl font-bold">{Number(v?.total_units ?? 0).toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="batches">
        <TabsList data-testid="tabs-inventory">
          <TabsTrigger value="batches">Batches</TabsTrigger>
          <TabsTrigger value="reorder">
            Reorder Suggestions
            {reorderItems.length > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold px-1.5 min-w-[18px] h-[18px]">
                {reorderItems.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="batches">
          <Card>
            <CardContent className="p-0">
              {batchLoading ? (
                <div className="p-6 space-y-3">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
              ) : (
                <div className="overflow-x-auto">

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Medicine</TableHead>
                      <TableHead className="hidden sm:table-cell">Batch #</TableHead>
                      <TableHead>Expiry</TableHead>
                      <TableHead>Qty</TableHead>
                      <TableHead className="hidden md:table-cell">Purchase Price</TableHead>
                      <TableHead className="hidden sm:table-cell">Selling Price</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {batchData.length === 0 ? (
                      <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-12">No batches found</TableCell></TableRow>
                    ) : batchData.map((b: any) => {
                      const expiry = b.expiryDate ?? b.expiry_date;
                      const isExpired = expiry < now;
                      const isExpiring = !isExpired && expiry <= thresholdStr;
                      const daysLeft = expiry ? Math.ceil((new Date(expiry).getTime() - Date.now()) / 86_400_000) : null;
                      return (
                        <TableRow
                          key={b.id}
                          data-testid={`row-batch-${b.id}`}
                          className={isExpired ? "bg-red-50/50 dark:bg-red-950/20" : isExpiring ? "bg-orange-50/40 dark:bg-orange-950/10" : ""}
                        >
                          <TableCell className="font-medium">{b.medicineName ?? b.medicine_name}</TableCell>
                          <TableCell className="hidden sm:table-cell font-mono text-sm">{b.batchNumber ?? b.batch_number}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5">
                              <span className={`text-sm font-medium ${isExpired ? "text-red-600 dark:text-red-400" : isExpiring ? "text-orange-500 dark:text-orange-400" : ""}`}>
                                {expiry}
                              </span>
                              {daysLeft !== null && isExpired && (
                                <span className="text-[10px] text-red-500 font-semibold">({Math.abs(daysLeft)}d ago)</span>
                              )}
                              {daysLeft !== null && isExpiring && (
                                <span className="text-[10px] text-orange-500 font-semibold">({daysLeft}d left)</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className={b.quantity === 0 ? "text-destructive font-bold" : b.quantity <= 10 ? "text-orange-500 font-bold" : ""}>{b.quantity}</span>
                          </TableCell>
                          <TableCell className="hidden md:table-cell font-mono text-sm">Rs. {Number(b.purchasePrice ?? b.purchase_price).toFixed(2)}</TableCell>
                          <TableCell className="hidden sm:table-cell font-mono text-sm">Rs. {Number(b.sellingPrice ?? b.selling_price).toFixed(2)}</TableCell>
                          <TableCell>
                            {isExpired
                              ? <Badge variant="destructive">Expired</Badge>
                              : isExpiring
                                ? <Badge className="bg-orange-100 text-orange-700 border border-orange-300 dark:bg-orange-950 dark:text-orange-300">Expiring Soon</Badge>
                                : <Badge variant="secondary">Active</Badge>}
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => {
                                  setEditingBatch(b);
                                  setPriceForm({
                                    purchase_price: String(b.purchasePrice ?? b.purchase_price ?? ""),
                                    selling_price: String(b.sellingPrice ?? b.selling_price ?? ""),
                                  });
                                  setPriceOpen(true);
                                }}>
                                  <PencilLine className="h-4 w-4 mr-2" /> Edit Prices
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => {
                                  setSelectedBatchId(b.id);
                                  adjustForm.setValue("batch_id", b.id);
                                  adjustForm.setValue("branch_id", b.branchId ?? b.branch_id ?? branchId ?? "");
                                  setAdjustOpen(true);
                                }}>
                                  <SlidersHorizontal className="h-4 w-4 mr-2" /> Adjust Stock
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>

                </div>
              )}
              <div className="flex items-center justify-between px-4 py-3 border-t text-sm text-muted-foreground flex-wrap gap-2">
                <span>
                  {totalBatches === 0
                    ? "No batches found"
                    : `Showing ${(page - 1) * perPage + 1}–${Math.min(page * perPage, totalBatches)} of ${totalBatches} batch${totalBatches !== 1 ? "es" : ""}`}
                </span>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs">Per page:</span>
                    <Select value={String(perPage)} onValueChange={(v) => { setPerPage(Number(v)); setPage(1); }}>
                      <SelectTrigger className="h-8 w-20 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="20">20</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                        <SelectItem value="100">100</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button size="sm" variant="outline" className="h-8" disabled={page === 1} onClick={() => setPage(1)}>«</Button>
                    <Button size="sm" variant="outline" className="h-8" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>‹ Prev</Button>
                    <span className="px-3 text-xs font-medium text-foreground">Page {page} of {totalPages || 1}</span>
                    <Button size="sm" variant="outline" className="h-8" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next ›</Button>
                    <Button size="sm" variant="outline" className="h-8" disabled={page >= totalPages} onClick={() => setPage(totalPages)}>»</Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reorder">
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Medicine</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Current Qty</TableHead>
                    <TableHead>Nearest Expiry</TableHead>
                    <TableHead>Reorder Point</TableHead>
                    <TableHead>Suggested Order</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reorderItems.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-12">No reorder suggestions</TableCell></TableRow>
                  ) : reorderItems.map((item: any, i: number) => {
                    const isCritical = item.urgency === "critical";
                    const daysLeft = item.days_until_expiry;
                    return (
                      <TableRow
                        key={i}
                        data-testid={`row-reorder-${i}`}
                        className={isCritical ? "bg-red-50/50 dark:bg-red-950/20" : item.urgency === "warning" ? "bg-orange-50/40 dark:bg-orange-950/10" : ""}
                      >
                        <TableCell className="font-medium">{item.medicine_name ?? item.medicineName}</TableCell>
                        <TableCell><Badge variant="outline">{item.category ?? "—"}</Badge></TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            {(item.reason === "low_stock" || item.reason == null) && (
                              <Badge className={isCritical ? "bg-red-100 text-red-700 border border-red-300 text-[10px]" : "bg-orange-100 text-orange-700 border border-orange-300 text-[10px]"}>
                                Low Stock
                              </Badge>
                            )}
                            {(item.reason === "expiry" || item.nearest_expiry) && (
                              <Badge className={daysLeft !== null && daysLeft < 0 ? "bg-red-100 text-red-700 border border-red-300 text-[10px]" : "bg-orange-100 text-orange-700 border border-orange-300 text-[10px]"}>
                                {daysLeft !== null && daysLeft < 0 ? "Expired" : "Expiring Soon"}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className={item.current_stock === 0 ? "text-destructive font-bold" : isCritical ? "text-orange-600 font-bold" : "font-medium"}>
                            {item.current_stock ?? 0}
                          </span>
                        </TableCell>
                        <TableCell>
                          {item.nearest_expiry ? (
                            <div className="text-xs">
                              <span className={daysLeft !== null && daysLeft < 0 ? "text-red-600 font-semibold" : daysLeft !== null && daysLeft <= 30 ? "text-red-500 font-semibold" : "text-orange-500 font-semibold"}>
                                {new Date(item.nearest_expiry).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                              </span>
                              <div className={daysLeft !== null && daysLeft < 0 ? "text-red-400" : "text-orange-400"}>
                                {daysLeft !== null && daysLeft < 0 ? `${Math.abs(daysLeft)}d ago` : `${daysLeft}d left`}
                              </div>
                            </div>
                          ) : <span className="text-muted-foreground text-xs">—</span>}
                        </TableCell>
                        <TableCell>{item.reorder_point ?? "—"}</TableCell>
                        <TableCell className="text-primary font-semibold">{item.suggested_order_qty ?? 50}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Batch Dialog */}
      <Dialog open={batchOpen} onOpenChange={setBatchOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Add Batch</DialogTitle></DialogHeader>
          <Form {...batchForm}>
            <form onSubmit={batchForm.handleSubmit(onBatchSubmit)} className="grid grid-cols-2 gap-4">
              {!branchId && (
                <FormField control={batchForm.control} name="branch_id" render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Branch *</FormLabel>
                    <FormControl>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger><SelectValue placeholder="Select branch" /></SelectTrigger>
                        <SelectContent>
                          {branchList.map((b: any) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              )}
              <FormField control={batchForm.control} name="medicine_id" render={({ field }) => (
                <FormItem className="col-span-2">
                  <FormLabel>Medicine *</FormLabel>
                  <FormControl>
                    <MedicineSearch value={field.value} onChange={(id, _name) => field.onChange(id)} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={batchForm.control} name="batch_number" render={({ field }) => (
                <FormItem><FormLabel>Batch Number *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={batchForm.control} name="expiry_date" render={({ field }) => (
                <FormItem><FormLabel>Expiry Date *</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={batchForm.control} name="quantity" render={({ field }) => (
                <FormItem><FormLabel>Quantity *</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={batchForm.control} name="purchase_price" render={({ field }) => (
                <FormItem><FormLabel>Purchase Price *</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={batchForm.control} name="selling_price" render={({ field }) => (
                <FormItem><FormLabel>Selling Price *</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <div className="col-span-2 flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setBatchOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={createBatch.isPending} data-testid="button-submit-batch">
                  {createBatch.isPending ? "Adding..." : "Add Batch"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit Prices Dialog */}
      <Dialog open={priceOpen} onOpenChange={setPriceOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit Prices — {editingBatch?.medicineName ?? editingBatch?.medicine_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            <div className="text-xs text-muted-foreground">Batch: {editingBatch?.batchNumber ?? editingBatch?.batch_number}</div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Purchase Price (Rs.) *</label>
              <Input
                type="number"
                step="0.01"
                value={priceForm.purchase_price}
                onChange={(e) => setPriceForm((f) => ({ ...f, purchase_price: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Selling Price (Rs.) *</label>
              <Input
                type="number"
                step="0.01"
                value={priceForm.selling_price}
                onChange={(e) => setPriceForm((f) => ({ ...f, selling_price: e.target.value }))}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setPriceOpen(false)}>Cancel</Button>
              <Button
                disabled={updateBatchPrice.isPending}
                onClick={() => {
                  if (!editingBatch) return;
                  updateBatchPrice.mutate({
                    batchId: editingBatch.id,
                    data: {
                      purchase_price: Number(priceForm.purchase_price),
                      selling_price: Number(priceForm.selling_price),
                    },
                  });
                }}
              >
                {updateBatchPrice.isPending ? "Saving..." : "Save Prices"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Adjust Stock Dialog */}
      <Dialog open={adjustOpen} onOpenChange={setAdjustOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Stock Adjustment</DialogTitle></DialogHeader>
          <Form {...adjustForm}>
            <form onSubmit={adjustForm.handleSubmit(onAdjustSubmit)} className="space-y-4">
              {!selectedBatchId && (
                <FormField control={adjustForm.control} name="batch_id" render={({ field }) => (
                  <FormItem><FormLabel>Batch ID *</FormLabel><FormControl><Input placeholder="Paste batch UUID" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              )}
              <FormField control={adjustForm.control} name="adjustment_type" render={({ field }) => (
                <FormItem><FormLabel>Type *</FormLabel>
                  <FormControl>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="correction">Correction</SelectItem>
                        <SelectItem value="damage">Damage Write-off</SelectItem>
                        <SelectItem value="expiry">Expiry Write-off</SelectItem>
                        <SelectItem value="transfer_in">Transfer In</SelectItem>
                        <SelectItem value="transfer_out">Transfer Out</SelectItem>
                        <SelectItem value="opening">Opening Stock</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage /></FormItem>
              )} />
              <FormField control={adjustForm.control} name="quantity_change" render={({ field }) => (
                <FormItem><FormLabel>Quantity Change (negative to reduce)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={adjustForm.control} name="reason" render={({ field }) => (
                <FormItem><FormLabel>Reason *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setAdjustOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={createAdjustment.isPending} data-testid="button-submit-adjustment">
                  {createAdjustment.isPending ? "Saving..." : "Record Adjustment"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
