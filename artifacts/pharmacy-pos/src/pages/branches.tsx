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
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Plus, Building2, Package } from "lucide-react";

const branchSchema = z.object({
  name: z.string().min(1, "Required"),
  code: z.string().min(1, "Required"),
  address: z.string().optional(),
  phone: z.string().optional(),
  license_number: z.string().optional(),
  tax_rate: z.coerce.number().min(0).max(1).default(0.17),
});
type BranchForm = z.infer<typeof branchSchema>;

function BranchStockSheet({ branchId, branchName, onClose }: { branchId: string; branchName: string; onClose: () => void }) {
  const { data, isLoading } = useGetBranchStockSummary(branchId, {
    query: { enabled: !!branchId, queryKey: getGetBranchStockSummaryQueryKey(branchId) },
  });
  const summary = data as any;

  return (
    <Sheet open={!!branchId} onOpenChange={() => onClose()}>
      <SheetContent className="w-[500px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Stock Summary — {branchName}</SheetTitle>
        </SheetHeader>
        {isLoading ? <Skeleton className="h-64 w-full mt-4" /> : (
          <div className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-3">
              <Card><CardContent className="p-3 text-center"><p className="text-2xl font-bold">{summary?.total_skus ?? 0}</p><p className="text-xs text-muted-foreground">Total SKUs</p></CardContent></Card>
              <Card><CardContent className="p-3 text-center"><p className="text-2xl font-bold">{summary?.total_units ?? 0}</p><p className="text-xs text-muted-foreground">Total Units</p></CardContent></Card>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Medicine</TableHead>
                  <TableHead>Batch</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Expiry</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(summary?.items ?? []).slice(0, 50).map((item: any, i: number) => (
                  <TableRow key={i}>
                    <TableCell className="text-sm">{item.medicineName ?? item.medicine_name}</TableCell>
                    <TableCell className="font-mono text-xs">{item.batchNumber ?? item.batch_number}</TableCell>
                    <TableCell>{item.quantity}</TableCell>
                    <TableCell className="text-xs">{item.expiryDate ?? item.expiry_date}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

export default function Branches() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [stockBranch, setStockBranch] = useState<{ id: string; name: string } | null>(null);

  const { data, isLoading } = useListBranches();
  const createBranch = useCreateBranch();

  const form = useForm<BranchForm>({
    resolver: zodResolver(branchSchema),
    defaultValues: { name: "", code: "", tax_rate: 0.17 },
  });

  const onSubmit = (values: BranchForm) => {
    createBranch.mutate({ data: values as any }, {
      onSuccess: () => {
        toast({ title: "Branch created" });
        setOpen(false);
        queryClient.invalidateQueries({ queryKey: getListBranchesQueryKey() });
        form.reset();
      },
      onError: () => toast({ title: "Failed to create branch", variant: "destructive" }),
    });
  };

  const branches = Array.isArray(data) ? data : [];

  return (
    <div className="space-y-6">
      {stockBranch && (
        <BranchStockSheet branchId={stockBranch.id} branchName={stockBranch.name} onClose={() => setStockBranch(null)} />
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Branches</h1>
          <p className="text-muted-foreground mt-1">{branches.length} branches registered</p>
        </div>
        <Button onClick={() => setOpen(true)} data-testid="button-add-branch">
          <Plus className="h-4 w-4 mr-2" /> Add Branch
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32 w-full" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {branches.map((b: any) => (
            <Card key={b.id} data-testid={`card-branch-${b.id}`}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-primary" />
                    <div>
                      <h3 className="font-semibold">{b.name}</h3>
                      <p className="text-xs font-mono text-muted-foreground">{b.code}</p>
                    </div>
                  </div>
                  <Badge variant={(b.isActive ?? b.is_active) ? "default" : "secondary"}>
                    {(b.isActive ?? b.is_active) ? "Active" : "Inactive"}
                  </Badge>
                </div>
                {b.address && <p className="text-sm text-muted-foreground mb-1">{b.address}</p>}
                {b.phone && <p className="text-sm text-muted-foreground mb-3">{b.phone}</p>}
                <div className="flex justify-between items-center text-xs text-muted-foreground mb-3">
                  <span>Tax Rate: {(Number(b.taxRate ?? b.tax_rate ?? 0) * 100).toFixed(0)}%</span>
                  {b.licenseNumber ?? b.license_number ? <span>DL: {b.licenseNumber ?? b.license_number}</span> : null}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full"
                  onClick={() => setStockBranch({ id: b.id, name: b.name })}
                  data-testid={`button-view-stock-${b.id}`}
                >
                  <Package className="h-3 w-3 mr-2" /> View Stock
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add Branch</DialogTitle></DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem className="col-span-2"><FormLabel>Branch Name *</FormLabel><FormControl><Input {...field} data-testid="input-branch-name" /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="code" render={({ field }) => (
                <FormItem><FormLabel>Branch Code *</FormLabel><FormControl><Input placeholder="e.g. MAIN" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="tax_rate" render={({ field }) => (
                <FormItem><FormLabel>Tax Rate (0-1)</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
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
                <Button type="submit" disabled={createBranch.isPending} data-testid="button-submit-branch">
                  {createBranch.isPending ? "Creating..." : "Create Branch"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
