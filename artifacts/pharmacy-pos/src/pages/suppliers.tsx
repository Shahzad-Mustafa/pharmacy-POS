import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  useListSuppliers,
  getListSuppliersQueryKey,
  useCreateSupplier,
  useUpdateSupplier,
  useListPurchaseOrders,
  getListPurchaseOrdersQueryKey,
  useCreatePurchaseOrder,
  useListGrns,
  getListGrnsQueryKey,
  useCreateGrn,
  useGetPayablesAging,
  getGetPayablesAgingQueryKey,
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Truck } from "lucide-react";

const supplierSchema = z.object({
  name: z.string().min(1, "Required"),
  contact_person: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  address: z.string().optional(),
  license_number: z.string().optional(),
  ntn: z.string().optional(),
  credit_days: z.coerce.number().default(30),
  payment_terms: z.string().optional(),
  notes: z.string().optional(),
});

type SupplierForm = z.infer<typeof supplierSchema>;

export default function Suppliers() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editSupplier, setEditSupplier] = useState<any>(null);
  const [page, setPage] = useState(1);

  const branchId = user?.branch_id ?? undefined;

  const { data: suppliersData, isLoading } = useListSuppliers({ page });
  const { data: posData } = useListPurchaseOrders(
    { branch_id: branchId },
    { query: { queryKey: getListPurchaseOrdersQueryKey({ branch_id: branchId }) } }
  );
  const { data: grnsData } = useListGrns(
    { branch_id: branchId },
    { query: { queryKey: getListGrnsQueryKey({ branch_id: branchId }) } }
  );
  const { data: agingData } = useGetPayablesAging(
    { branch_id: branchId },
    { query: { queryKey: getGetPayablesAgingQueryKey({ branch_id: branchId }) } }
  );

  const createSupplier = useCreateSupplier();
  const updateSupplier = useUpdateSupplier();

  const form = useForm<SupplierForm>({
    resolver: zodResolver(supplierSchema),
    defaultValues: { name: "", credit_days: 30 },
  });

  const openCreate = () => {
    setEditSupplier(null);
    form.reset({ name: "", credit_days: 30 });
    setOpen(true);
  };

  const openEdit = (s: any) => {
    setEditSupplier(s);
    form.reset({
      name: s.name,
      contact_person: s.contactPerson ?? s.contact_person ?? "",
      phone: s.phone ?? "",
      email: s.email ?? "",
      address: s.address ?? "",
      license_number: s.licenseNumber ?? s.license_number ?? "",
      ntn: s.ntn ?? "",
      credit_days: s.creditDays ?? s.credit_days ?? 30,
      payment_terms: s.paymentTerms ?? s.payment_terms ?? "",
    });
    setOpen(true);
  };

  const onSubmit = (values: SupplierForm) => {
    if (editSupplier) {
      updateSupplier.mutate({ supplierId: editSupplier.id, data: values as any }, {
        onSuccess: () => { toast({ title: "Supplier updated" }); setOpen(false); queryClient.invalidateQueries({ queryKey: getListSuppliersQueryKey() }); },
        onError: () => toast({ title: "Failed to update", variant: "destructive" }),
      });
    } else {
      createSupplier.mutate({ data: values as any }, {
        onSuccess: () => { toast({ title: "Supplier added" }); setOpen(false); queryClient.invalidateQueries({ queryKey: getListSuppliersQueryKey() }); },
        onError: () => toast({ title: "Failed to add", variant: "destructive" }),
      });
    }
  };

  const suppliers = (suppliersData as any)?.data ?? [];
  const totalPages = (suppliersData as any)?.total_pages ?? 1;
  const pos = (posData as any)?.data ?? [];
  const grns = (grnsData as any)?.data ?? [];
  const aging = Array.isArray(agingData) ? agingData : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Suppliers</h1>
          <p className="text-muted-foreground mt-1">Manage suppliers, purchase orders, and GRNs</p>
        </div>
        <Button onClick={openCreate} data-testid="button-add-supplier">
          <Plus className="h-4 w-4 mr-2" /> Add Supplier
        </Button>
      </div>

      <Tabs defaultValue="suppliers">
        <TabsList>
          <TabsTrigger value="suppliers">Suppliers</TabsTrigger>
          <TabsTrigger value="pos">Purchase Orders ({pos.length})</TabsTrigger>
          <TabsTrigger value="grns">GRNs ({grns.length})</TabsTrigger>
          <TabsTrigger value="aging">Payables Aging</TabsTrigger>
        </TabsList>

        <TabsContent value="suppliers">
          <Card>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-6 space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Supplier</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Credit Days</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {suppliers.length === 0 ? (
                      <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-12">No suppliers found</TableCell></TableRow>
                    ) : suppliers.map((s: any) => (
                      <TableRow key={s.id} data-testid={`row-supplier-${s.id}`}>
                        <TableCell>
                          <div className="font-medium">{s.name}</div>
                          <div className="text-xs text-muted-foreground">{s.licenseNumber ?? s.license_number}</div>
                        </TableCell>
                        <TableCell>{s.contactPerson ?? s.contact_person ?? "—"}</TableCell>
                        <TableCell>{s.phone ?? "—"}</TableCell>
                        <TableCell>{s.creditDays ?? s.credit_days ?? "—"} days</TableCell>
                        <TableCell>
                          <Badge variant={(s.isActive ?? s.is_active) ? "default" : "secondary"}>
                            {(s.isActive ?? s.is_active) ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="ghost" onClick={() => openEdit(s)} data-testid={`button-edit-supplier-${s.id}`}>
                            <Edit className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
              {totalPages > 1 && (
                <div className="flex items-center justify-between p-4 border-t">
                  <Button size="sm" variant="outline" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
                  <Button size="sm" variant="outline" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pos">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>PO Number</TableHead>
                    <TableHead>Order Date</TableHead>
                    <TableHead>Expected</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pos.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-12">No purchase orders</TableCell></TableRow>
                  ) : pos.map((po: any) => (
                    <TableRow key={po.id} data-testid={`row-po-${po.id}`}>
                      <TableCell className="font-mono text-sm">{po.poNumber ?? po.po_number}</TableCell>
                      <TableCell>{po.orderDate ?? po.order_date}</TableCell>
                      <TableCell>{po.expectedDate ?? po.expected_date ?? "—"}</TableCell>
                      <TableCell className="font-mono">Rs. {Number(po.totalAmount ?? po.total_amount ?? 0).toFixed(2)}</TableCell>
                      <TableCell><Badge variant="outline" className="capitalize">{po.status}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="grns">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>GRN Number</TableHead>
                    <TableHead>Received Date</TableHead>
                    <TableHead>Supplier Invoice</TableHead>
                    <TableHead>Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {grns.length === 0 ? (
                    <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-12">No GRNs found</TableCell></TableRow>
                  ) : grns.map((grn: any) => (
                    <TableRow key={grn.id} data-testid={`row-grn-${grn.id}`}>
                      <TableCell className="font-mono text-sm">{grn.grnNumber ?? grn.grn_number}</TableCell>
                      <TableCell>{grn.receivedDate ?? grn.received_date}</TableCell>
                      <TableCell>{grn.supplierInvoiceNumber ?? grn.supplier_invoice_number ?? "—"}</TableCell>
                      <TableCell className="font-mono">Rs. {Number(grn.totalAmount ?? grn.total_amount ?? 0).toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="aging">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Current</TableHead>
                    <TableHead>1-30 Days</TableHead>
                    <TableHead>31-60 Days</TableHead>
                    <TableHead>61-90 Days</TableHead>
                    <TableHead>90+ Days</TableHead>
                    <TableHead>Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {aging.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-12">No payables data</TableCell></TableRow>
                  ) : aging.map((a: any) => (
                    <TableRow key={a.supplier_id}>
                      <TableCell className="font-medium">{a.supplier_name}</TableCell>
                      <TableCell className="font-mono">Rs. {Number(a.current ?? 0).toFixed(2)}</TableCell>
                      <TableCell className="font-mono">Rs. {Number(a.days_1_30 ?? 0).toFixed(2)}</TableCell>
                      <TableCell className="font-mono">Rs. {Number(a.days_31_60 ?? 0).toFixed(2)}</TableCell>
                      <TableCell className="font-mono">Rs. {Number(a.days_61_90 ?? 0).toFixed(2)}</TableCell>
                      <TableCell className="font-mono text-destructive">Rs. {Number(a.over_90 ?? 0).toFixed(2)}</TableCell>
                      <TableCell className="font-mono font-bold">Rs. {Number(a.total ?? 0).toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editSupplier ? "Edit Supplier" : "Add Supplier"}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem className="col-span-2"><FormLabel>Company Name *</FormLabel><FormControl><Input {...field} data-testid="input-supplier-name" /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="contact_person" render={({ field }) => (
                <FormItem><FormLabel>Contact Person</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="phone" render={({ field }) => (
                <FormItem><FormLabel>Phone</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="credit_days" render={({ field }) => (
                <FormItem><FormLabel>Credit Days</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="license_number" render={({ field }) => (
                <FormItem><FormLabel>License Number</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="ntn" render={({ field }) => (
                <FormItem><FormLabel>NTN</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="address" render={({ field }) => (
                <FormItem className="col-span-2"><FormLabel>Address</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <div className="col-span-2 flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={createSupplier.isPending || updateSupplier.isPending} data-testid="button-submit-supplier">
                  {createSupplier.isPending || updateSupplier.isPending ? "Saving..." : editSupplier ? "Update" : "Add Supplier"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
