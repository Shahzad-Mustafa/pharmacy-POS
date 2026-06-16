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
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
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
import { Package, AlertTriangle, TrendingUp, Plus } from "lucide-react";

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

export default function Inventory() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [batchOpen, setBatchOpen] = useState(false);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const branchId = user?.branch_id ?? undefined;

  const { data: overview, isLoading: ovLoading } = useGetInventoryOverview(
    { branch_id: branchId },
    { query: { queryKey: getGetInventoryOverviewQueryKey({ branch_id: branchId }) } }
  );
  const { data: batches, isLoading: batchLoading } = useListBatches(
    { branch_id: branchId, page },
    { query: { queryKey: getListBatchesQueryKey({ branch_id: branchId, page }) } }
  );
  const { data: valuation } = useGetStockValuation(
    { branch_id: branchId },
    { query: { queryKey: getGetStockValuationQueryKey({ branch_id: branchId }) } }
  );
  const { data: reorder } = useGetReorderSuggestions(
    { branch_id: branchId },
    { query: { queryKey: getGetReorderSuggestionsQueryKey({ branch_id: branchId }) } }
  );

  const createBatch = useCreateBatch();
  const createAdjustment = useCreateStockAdjustment();

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
  const totalBatches = (batches as any)?.total ?? 0;
  const totalPages = (batches as any)?.total_pages ?? 1;
  const v = valuation as any;
  const reorderItems = Array.isArray(reorder) ? reorder : [];
  const overviewItems = Array.isArray(overview) ? overview : [];

  const now = new Date().toISOString().split("T")[0];
  const threshold = new Date();
  threshold.setDate(threshold.getDate() + 90);
  const thresholdStr = threshold.toISOString().split("T")[0];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Inventory</h1>
          <p className="text-muted-foreground mt-1">Stock levels, batches, and adjustments</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => { setAdjustOpen(true); setSelectedBatchId(null); }} data-testid="button-adjust-stock">
            <AlertTriangle className="h-4 w-4 mr-2" /> Adjust Stock
          </Button>
          <Button onClick={() => setBatchOpen(true)} data-testid="button-add-batch">
            <Plus className="h-4 w-4 mr-2" /> Add Batch
          </Button>
        </div>
      </div>

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
          <TabsTrigger value="reorder">Reorder Suggestions ({reorderItems.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="batches">
          <Card>
            <CardContent className="p-0">
              {batchLoading ? (
                <div className="p-6 space-y-3">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Medicine</TableHead>
                      <TableHead>Batch #</TableHead>
                      <TableHead>Expiry</TableHead>
                      <TableHead>Qty</TableHead>
                      <TableHead>Purchase Price</TableHead>
                      <TableHead>Selling Price</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {batchData.length === 0 ? (
                      <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-12">No batches found</TableCell></TableRow>
                    ) : batchData.map((b: any) => {
                      const expiry = b.expiryDate ?? b.expiry_date;
                      const isExpired = expiry < now;
                      const isExpiring = !isExpired && expiry <= thresholdStr;
                      return (
                        <TableRow key={b.id} data-testid={`row-batch-${b.id}`}>
                          <TableCell className="font-medium">{b.medicineName ?? b.medicine_name}</TableCell>
                          <TableCell className="font-mono text-sm">{b.batchNumber ?? b.batch_number}</TableCell>
                          <TableCell className="text-sm">{expiry}</TableCell>
                          <TableCell>
                            <span className={b.quantity <= 10 ? "text-destructive font-bold" : ""}>{b.quantity}</span>
                          </TableCell>
                          <TableCell className="font-mono text-sm">Rs. {Number(b.purchasePrice ?? b.purchase_price).toFixed(2)}</TableCell>
                          <TableCell className="font-mono text-sm">Rs. {Number(b.sellingPrice ?? b.selling_price).toFixed(2)}</TableCell>
                          <TableCell>
                            {isExpired ? <Badge variant="destructive">Expired</Badge>
                              : isExpiring ? <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">Expiring</Badge>
                              : <Badge variant="secondary">Active</Badge>}
                          </TableCell>
                          <TableCell>
                            <Button size="sm" variant="ghost" onClick={() => {
                              setSelectedBatchId(b.id);
                              adjustForm.setValue("batch_id", b.id);
                              adjustForm.setValue("branch_id", b.branchId ?? b.branch_id ?? branchId ?? "");
                              setAdjustOpen(true);
                            }} data-testid={`button-adjust-batch-${b.id}`}>Adjust</Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
              {totalPages > 1 && (
                <div className="flex items-center justify-between p-4 border-t">
                  <p className="text-sm text-muted-foreground">Page {page} of {totalPages}</p>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
                    <Button size="sm" variant="outline" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reorder">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Medicine</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Current Qty</TableHead>
                    <TableHead>Reorder Point</TableHead>
                    <TableHead>Suggested Order</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reorderItems.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-12">No reorder suggestions</TableCell></TableRow>
                  ) : reorderItems.map((item: any, i: number) => (
                    <TableRow key={i} data-testid={`row-reorder-${i}`}>
                      <TableCell className="font-medium">{item.medicineName ?? item.medicine_name}</TableCell>
                      <TableCell><Badge variant="outline">{item.category ?? "—"}</Badge></TableCell>
                      <TableCell className="text-destructive font-bold">{item.quantity}</TableCell>
                      <TableCell>{item.reorderPoint ?? item.reorder_point ?? item.minStockLevel ?? item.min_stock_level ?? "—"}</TableCell>
                      <TableCell className="text-primary font-medium">{item.suggested_order_qty ?? 50}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
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
              <FormField control={batchForm.control} name="medicine_id" render={({ field }) => (
                <FormItem className="col-span-2"><FormLabel>Medicine ID *</FormLabel><FormControl><Input placeholder="Paste medicine UUID" {...field} /></FormControl><FormMessage /></FormItem>
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
