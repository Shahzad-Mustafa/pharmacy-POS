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
  useSearchMedicines,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent } from "@/components/ui/card";
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
import { Plus, Edit, Trash2, ShoppingCart, PackageCheck, Truck } from "lucide-react";
import { PageHeader } from "@/components/page-header";

// ── Schemas ────────────────────────────────────────────────────────────────
const supplierSchema = z.object({
  name: z.string().min(1, "Required"),
  contact_person: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  address: z.string().optional(),
  license_number: z.string().optional(),
  ntn: z.string().optional(),
  credit_days: z.coerce.number().default(30),
  notes: z.string().optional(),
});
type SupplierForm = z.infer<typeof supplierSchema>;

// ── Medicine search mini-component ─────────────────────────────────────────
function MedSearch({ onSelect }: { onSelect: (med: any) => void }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const { data } = useSearchMedicines({ q }, { query: { enabled: q.length >= 2, queryKey: ["sup-med", q] } });
  const results = Array.isArray(data) ? data : (data as any)?.data ?? [];
  return (
    <div className="relative">
      <Input placeholder="Search medicine to add…" value={q}
        onChange={e => { setQ(e.target.value); setOpen(true); }}
        onBlur={() => setTimeout(() => setOpen(false), 150)} />
      {open && results.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-card border rounded-md shadow-lg max-h-44 overflow-y-auto">
          {results.slice(0, 8).map((m: any) => (
            <div key={m.id} className="px-3 py-2 hover:bg-accent cursor-pointer text-sm"
              onMouseDown={() => { onSelect(m); setQ(""); setOpen(false); }}>
              <span className="font-medium">{m.name}</span>
              <span className="text-muted-foreground ml-2 text-xs">{m.category}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main component ──────────────────────────────────────────────────────────
export default function Suppliers() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const branchId = user?.branch_id ?? "";

  // Supplier dialog
  const [supplierOpen, setSupplierOpen] = useState(false);
  const [editSupplier, setEditSupplier] = useState<any>(null);

  // PO dialog
  const [poOpen, setPoOpen] = useState(false);
  const [poItems, setPoItems] = useState<{ medicine_id: string; name: string; quantity: number; unit_price: number }[]>([]);
  const [poSupplierId, setPoSupplierId] = useState("");
  const [poExpected, setPoExpected] = useState("");
  const [poNotes, setPoNotes] = useState("");

  // GRN dialog
  const [grnOpen, setGrnOpen] = useState(false);
  const [grnSupplierId, setGrnSupplierId] = useState("");
  const [grnInvoice, setGrnInvoice] = useState("");
  const [grnDate, setGrnDate] = useState("");
  const [grnNotes, setGrnNotes] = useState("");
  const [grnItems, setGrnItems] = useState<{ medicine_id: string; name: string; batch_number: string; expiry_date: string; quantity_received: number; purchase_price: number; selling_price: number }[]>([]);

  const { data: suppliersData, isLoading } = useListSuppliers({ page: 1, per_page: 100 } as any);
  const { data: posData } = useListPurchaseOrders({ branch_id: branchId } as any, { query: { queryKey: getListPurchaseOrdersQueryKey({ branch_id: branchId } as any) } });
  const { data: grnsData } = useListGrns({ branch_id: branchId } as any, { query: { queryKey: getListGrnsQueryKey({ branch_id: branchId } as any) } });
  const { data: agingData } = useGetPayablesAging({ branch_id: branchId } as any, { query: { queryKey: getGetPayablesAgingQueryKey({ branch_id: branchId } as any) } });

  const createSupplier = useCreateSupplier();
  const updateSupplier = useUpdateSupplier();
  const createPO = useCreatePurchaseOrder();
  const createGRN = useCreateGrn();

  const supplierForm = useForm<SupplierForm>({
    resolver: zodResolver(supplierSchema),
    defaultValues: { name: "", contact_person: "", phone: "", email: "", address: "", license_number: "", ntn: "", credit_days: 30, notes: "" },
  });

  const suppliers: any[] = (suppliersData as any)?.data ?? [];
  const pos: any[] = (posData as any)?.data ?? [];
  const grns: any[] = (grnsData as any)?.data ?? [];
  const aging: any[] = Array.isArray(agingData) ? agingData : [];

  // ── Supplier submit ───────────────────────────────────────────────────────
  const onSupplierSubmit = (values: SupplierForm) => {
    if (editSupplier) {
      updateSupplier.mutate({ supplierId: editSupplier.id, data: values as any }, {
        onSuccess: () => { toast({ title: "Supplier updated" }); setSupplierOpen(false); queryClient.invalidateQueries({ queryKey: getListSuppliersQueryKey() }); },
        onError: () => toast({ title: "Failed", variant: "destructive" }),
      });
    } else {
      createSupplier.mutate({ data: values as any }, {
        onSuccess: () => { toast({ title: "Supplier added" }); setSupplierOpen(false); queryClient.invalidateQueries({ queryKey: getListSuppliersQueryKey() }); },
        onError: () => toast({ title: "Failed", variant: "destructive" }),
      });
    }
  };

  const openEditSupplier = (s: any) => {
    setEditSupplier(s);
    supplierForm.reset({ name: s.name, contact_person: s.contactPerson ?? s.contact_person ?? "", phone: s.phone ?? "", email: s.email ?? "", address: s.address ?? "", license_number: s.licenseNumber ?? s.license_number ?? "", ntn: s.ntn ?? "", credit_days: s.creditDays ?? s.credit_days ?? 30 });
    setSupplierOpen(true);
  };

  // ── PO submit ─────────────────────────────────────────────────────────────
  const submitPO = () => {
    if (!poSupplierId || poItems.length === 0) { toast({ title: "Select supplier and add at least one medicine", variant: "destructive" }); return; }
    createPO.mutate({
      data: {
        supplier_id: poSupplierId, branch_id: branchId,
        expected_date: poExpected || undefined, notes: poNotes || undefined,
        items: poItems.map(i => ({ medicine_id: i.medicine_id, quantity: i.quantity, unit_price: i.unit_price })),
      } as any,
    }, {
      onSuccess: () => { toast({ title: "Purchase order created" }); setPoOpen(false); setPoItems([]); setPoSupplierId(""); setPoNotes(""); setPoExpected(""); queryClient.invalidateQueries({ queryKey: getListPurchaseOrdersQueryKey() }); },
      onError: () => toast({ title: "Failed to create PO", variant: "destructive" }),
    });
  };

  // ── GRN submit ────────────────────────────────────────────────────────────
  const submitGRN = () => {
    if (!grnSupplierId || grnItems.length === 0) { toast({ title: "Select supplier and add at least one item", variant: "destructive" }); return; }
    createGRN.mutate({
      data: {
        supplier_id: grnSupplierId, branch_id: branchId,
        supplier_invoice_number: grnInvoice || undefined,
        received_date: grnDate || undefined, notes: grnNotes || undefined,
        items: grnItems.map(i => ({ medicine_id: i.medicine_id, batch_number: i.batch_number, expiry_date: i.expiry_date || undefined, quantity_ordered: i.quantity_received, quantity_received: i.quantity_received, purchase_price: i.purchase_price, selling_price: i.selling_price, free_qty: 0 })),
      } as any,
    }, {
      onSuccess: () => { toast({ title: "GRN recorded — inventory updated" }); setGrnOpen(false); setGrnItems([]); setGrnSupplierId(""); setGrnInvoice(""); setGrnDate(""); setGrnNotes(""); queryClient.invalidateQueries({ queryKey: getListGrnsQueryKey() }); },
      onError: () => toast({ title: "Failed to create GRN", variant: "destructive" }),
    });
  };

  const poTotal = poItems.reduce((s, i) => s + i.quantity * i.unit_price, 0);
  const grnTotal = grnItems.reduce((s, i) => s + i.quantity_received * i.purchase_price, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Suppliers"
        subtitle="Manage suppliers, purchase orders, and GRNs"
        icon={Truck}
        gradient="from-amber-600 via-amber-500 to-orange-500"
        actions={
          <Button className="bg-white text-amber-700 hover:bg-amber-50 font-semibold" onClick={() => { setEditSupplier(null); supplierForm.reset({ name: "", credit_days: 30 }); setSupplierOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" /> Add Supplier
          </Button>
        }
      />

      <Tabs defaultValue="suppliers">
        <TabsList>
          <TabsTrigger value="suppliers">Suppliers</TabsTrigger>
          <TabsTrigger value="pos">Purchase Orders ({pos.length})</TabsTrigger>
          <TabsTrigger value="grns">GRNs ({grns.length})</TabsTrigger>
          <TabsTrigger value="aging">Payables Aging</TabsTrigger>
        </TabsList>

        {/* ── Suppliers tab ── */}
        <TabsContent value="suppliers">
          <Card>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-6 space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
              ) : (
                <div className="overflow-x-auto">

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Supplier</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Credit Days</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-10" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {suppliers.length === 0 ? (
                      <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-12">No suppliers found</TableCell></TableRow>
                    ) : suppliers.map((s: any) => (
                      <TableRow key={s.id}>
                        <TableCell>
                          <div className="font-medium">{s.name}</div>
                          <div className="text-xs text-muted-foreground">{s.licenseNumber ?? s.license_number}</div>
                        </TableCell>
                        <TableCell>{s.contactPerson ?? s.contact_person ?? "—"}</TableCell>
                        <TableCell>{s.phone ?? "—"}</TableCell>
                        <TableCell className="text-xs">{s.email ?? "—"}</TableCell>
                        <TableCell>{s.creditDays ?? s.credit_days ?? "—"} days</TableCell>
                        <TableCell><Badge variant={(s.isActive ?? s.is_active) ? "default" : "secondary"}>{(s.isActive ?? s.is_active) ? "Active" : "Inactive"}</Badge></TableCell>
                        <TableCell><Button size="sm" variant="ghost" onClick={() => openEditSupplier(s)}><Edit className="h-4 w-4" /></Button></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Purchase Orders tab ── */}
        <TabsContent value="pos">
          <div className="flex justify-end mb-3">
            <Button onClick={() => setPoOpen(true)}>
              <ShoppingCart className="h-4 w-4 mr-2" /> Create Purchase Order
            </Button>
          </div>
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>PO Number</TableHead>
                    <TableHead className="hidden sm:table-cell">Supplier</TableHead>
                    <TableHead className="hidden md:table-cell">Order Date</TableHead>
                    <TableHead className="hidden md:table-cell">Expected Delivery</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pos.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-12">No purchase orders yet — click "Create Purchase Order" to raise one</TableCell></TableRow>
                  ) : pos.map((po: any) => (
                    <TableRow key={po.id}>
                      <TableCell className="font-mono text-sm font-medium">{po.poNumber ?? po.po_number}</TableCell>
                      <TableCell className="hidden sm:table-cell">{suppliers.find(s => s.id === (po.supplierId ?? po.supplier_id))?.name ?? "—"}</TableCell>
                      <TableCell className="hidden md:table-cell">{po.orderDate ?? po.order_date ?? "—"}</TableCell>
                      <TableCell className="hidden md:table-cell">{po.expectedDate ?? po.expected_date ?? "—"}</TableCell>
                      <TableCell className="font-mono">Rs. {Number(po.total ?? po.totalAmount ?? 0).toFixed(2)}</TableCell>
                      <TableCell><Badge variant="outline" className="capitalize">{po.status}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── GRNs tab ── */}
        <TabsContent value="grns">
          <div className="flex justify-end mb-3">
            <Button onClick={() => setGrnOpen(true)}>
              <PackageCheck className="h-4 w-4 mr-2" /> Record GRN
            </Button>
          </div>
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>GRN Number</TableHead>
                    <TableHead className="hidden sm:table-cell">Supplier</TableHead>
                    <TableHead className="hidden md:table-cell">Received Date</TableHead>
                    <TableHead className="hidden md:table-cell">Invoice #</TableHead>
                    <TableHead>Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {grns.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-12">No GRNs yet — click "Record GRN" when medicines arrive</TableCell></TableRow>
                  ) : grns.map((grn: any) => (
                    <TableRow key={grn.id}>
                      <TableCell className="font-mono text-sm font-medium">{grn.grnNumber ?? grn.grn_number}</TableCell>
                      <TableCell className="hidden sm:table-cell">{suppliers.find(s => s.id === (grn.supplierId ?? grn.supplier_id))?.name ?? "—"}</TableCell>
                      <TableCell className="hidden md:table-cell">{grn.receivedDate ?? grn.received_date ?? "—"}</TableCell>
                      <TableCell className="hidden md:table-cell">{grn.supplierInvoiceNumber ?? grn.supplier_invoice_number ?? "—"}</TableCell>
                      <TableCell className="font-mono">Rs. {Number(grn.total ?? grn.totalAmount ?? 0).toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Payables Aging tab ── */}
        <TabsContent value="aging">
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Current</TableHead>
                    <TableHead>1–30 Days</TableHead>
                    <TableHead>31–60 Days</TableHead>
                    <TableHead>61–90 Days</TableHead>
                    <TableHead className="text-destructive">90+ Days</TableHead>
                    <TableHead>Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {aging.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-12">No outstanding payables</TableCell></TableRow>
                  ) : aging.map((a: any) => (
                    <TableRow key={a.supplier_id}>
                      <TableCell className="font-medium">{a.supplier_name}</TableCell>
                      <TableCell className="font-mono">Rs. {Number(a.current ?? 0).toFixed(0)}</TableCell>
                      <TableCell className="font-mono">Rs. {Number(a.days_1_30 ?? 0).toFixed(0)}</TableCell>
                      <TableCell className="font-mono text-orange-500">Rs. {Number(a.days_31_60 ?? 0).toFixed(0)}</TableCell>
                      <TableCell className="font-mono text-orange-600">Rs. {Number(a.days_61_90 ?? 0).toFixed(0)}</TableCell>
                      <TableCell className="font-mono text-destructive font-semibold">Rs. {Number(a.over_90 ?? 0).toFixed(0)}</TableCell>
                      <TableCell className="font-mono font-bold">Rs. {Number(a.total ?? 0).toFixed(0)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ════ Add/Edit Supplier Dialog ════ */}
      <Dialog open={supplierOpen} onOpenChange={setSupplierOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editSupplier ? "Edit Supplier" : "Add Supplier"}</DialogTitle></DialogHeader>
          <Form {...supplierForm}>
            <form onSubmit={supplierForm.handleSubmit(onSupplierSubmit)} className="grid grid-cols-2 gap-4">
              <FormField control={supplierForm.control} name="name" render={({ field }) => (
                <FormItem className="col-span-2"><FormLabel>Company Name *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={supplierForm.control} name="contact_person" render={({ field }) => (
                <FormItem><FormLabel>Contact Person</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={supplierForm.control} name="phone" render={({ field }) => (
                <FormItem><FormLabel>Phone</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={supplierForm.control} name="email" render={({ field }) => (
                <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={supplierForm.control} name="credit_days" render={({ field }) => (
                <FormItem><FormLabel>Credit Days</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={supplierForm.control} name="license_number" render={({ field }) => (
                <FormItem><FormLabel>License Number</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={supplierForm.control} name="ntn" render={({ field }) => (
                <FormItem><FormLabel>NTN</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={supplierForm.control} name="address" render={({ field }) => (
                <FormItem className="col-span-2"><FormLabel>Address</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <div className="col-span-2 flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setSupplierOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={createSupplier.isPending || updateSupplier.isPending}>
                  {createSupplier.isPending || updateSupplier.isPending ? "Saving…" : editSupplier ? "Update" : "Add Supplier"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* ════ Create Purchase Order Dialog ════ */}
      <Dialog open={poOpen} onOpenChange={setPoOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Create Purchase Order</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-medium">Supplier *</label>
                <Select value={poSupplierId} onValueChange={setPoSupplierId}>
                  <SelectTrigger><SelectValue placeholder="Select supplier" /></SelectTrigger>
                  <SelectContent>{suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Expected Delivery</label>
                <Input type="date" value={poExpected} onChange={e => setPoExpected(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Notes</label>
              <Input value={poNotes} onChange={e => setPoNotes(e.target.value)} placeholder="Optional notes" />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Add Medicine</label>
              <MedSearch onSelect={m => setPoItems(prev => {
                const exists = prev.find(i => i.medicine_id === m.id);
                if (exists) return prev;
                return [...prev, { medicine_id: m.id, name: m.name, quantity: 1, unit_price: Number(m.mrp ?? 0) }];
              })} />
            </div>

            {poItems.length > 0 && (
              <div className="border rounded-md overflow-hidden">
                <div className="overflow-x-auto">

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Medicine</TableHead>
                      <TableHead className="w-24">Qty</TableHead>
                      <TableHead className="w-32">Unit Price</TableHead>
                      <TableHead className="w-28">Subtotal</TableHead>
                      <TableHead className="w-8" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {poItems.map((item, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="text-sm">{item.name}</TableCell>
                        <TableCell><Input type="number" min={1} className="h-7 w-20" value={item.quantity} onChange={e => setPoItems(p => p.map((x, i) => i === idx ? { ...x, quantity: Number(e.target.value) } : x))} /></TableCell>
                        <TableCell><Input type="number" step="0.01" className="h-7 w-28" value={item.unit_price} onChange={e => setPoItems(p => p.map((x, i) => i === idx ? { ...x, unit_price: Number(e.target.value) } : x))} /></TableCell>
                        <TableCell className="font-mono text-sm">Rs. {(item.quantity * item.unit_price).toFixed(0)}</TableCell>
                        <TableCell><Button size="sm" variant="ghost" onClick={() => setPoItems(p => p.filter((_, i) => i !== idx))}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button></TableCell>
                      </TableRow>
                    ))}
                    <TableRow>
                      <TableCell colSpan={3} className="text-right font-semibold">Total</TableCell>
                      <TableCell className="font-mono font-bold">Rs. {poTotal.toFixed(0)}</TableCell>
                      <TableCell />
                    </TableRow>
                  </TableBody>
                </Table>

                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setPoOpen(false)}>Cancel</Button>
              <Button onClick={submitPO} disabled={createPO.isPending || !poSupplierId || poItems.length === 0}>
                {createPO.isPending ? "Creating…" : "Create PO"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ════ Record GRN Dialog ════ */}
      <Dialog open={grnOpen} onOpenChange={setGrnOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Record Goods Received (GRN)</DialogTitle>
            <p className="text-sm text-muted-foreground">When medicines arrive, record them here — this automatically adds them to inventory.</p>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-medium">Supplier *</label>
                <Select value={grnSupplierId} onValueChange={setGrnSupplierId}>
                  <SelectTrigger><SelectValue placeholder="Select supplier" /></SelectTrigger>
                  <SelectContent>{suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Supplier Invoice #</label>
                <Input value={grnInvoice} onChange={e => setGrnInvoice(e.target.value)} placeholder="e.g. INV-2024-001" />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Received Date</label>
                <Input type="date" value={grnDate} onChange={e => setGrnDate(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Notes</label>
                <Input value={grnNotes} onChange={e => setGrnNotes(e.target.value)} placeholder="Optional" />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Add Medicine</label>
              <MedSearch onSelect={m => setGrnItems(prev => {
                if (prev.find(i => i.medicine_id === m.id)) return prev;
                return [...prev, { medicine_id: m.id, name: m.name, batch_number: "", expiry_date: "", quantity_received: 1, purchase_price: 0, selling_price: Number(m.mrp ?? 0) }];
              })} />
            </div>

            {grnItems.length > 0 && (
              <div className="border rounded-md overflow-hidden">
                <div className="overflow-x-auto">

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Medicine</TableHead>
                      <TableHead>Batch #</TableHead>
                      <TableHead>Expiry</TableHead>
                      <TableHead>Qty</TableHead>
                      <TableHead>Purchase Rs.</TableHead>
                      <TableHead>Selling Rs.</TableHead>
                      <TableHead className="w-8" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {grnItems.map((item, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="text-sm font-medium">{item.name}</TableCell>
                        <TableCell><Input className="h-7 w-28" placeholder="BTH-001" value={item.batch_number} onChange={e => setGrnItems(p => p.map((x, i) => i === idx ? { ...x, batch_number: e.target.value } : x))} /></TableCell>
                        <TableCell><Input type="date" className="h-7 w-34" value={item.expiry_date} onChange={e => setGrnItems(p => p.map((x, i) => i === idx ? { ...x, expiry_date: e.target.value } : x))} /></TableCell>
                        <TableCell><Input type="number" min={1} className="h-7 w-16" value={item.quantity_received} onChange={e => setGrnItems(p => p.map((x, i) => i === idx ? { ...x, quantity_received: Number(e.target.value) } : x))} /></TableCell>
                        <TableCell><Input type="number" step="0.01" className="h-7 w-24" value={item.purchase_price} onChange={e => setGrnItems(p => p.map((x, i) => i === idx ? { ...x, purchase_price: Number(e.target.value) } : x))} /></TableCell>
                        <TableCell><Input type="number" step="0.01" className="h-7 w-24" value={item.selling_price} onChange={e => setGrnItems(p => p.map((x, i) => i === idx ? { ...x, selling_price: Number(e.target.value) } : x))} /></TableCell>
                        <TableCell><Button size="sm" variant="ghost" onClick={() => setGrnItems(p => p.filter((_, i) => i !== idx))}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button></TableCell>
                      </TableRow>
                    ))}
                    <TableRow>
                      <TableCell colSpan={4} className="text-right font-semibold">Total Cost</TableCell>
                      <TableCell className="font-mono font-bold" colSpan={3}>Rs. {grnTotal.toFixed(0)}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>

                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setGrnOpen(false)}>Cancel</Button>
              <Button onClick={submitGRN} disabled={createGRN.isPending || !grnSupplierId || grnItems.length === 0}>
                {createGRN.isPending ? "Saving…" : "Record GRN & Update Inventory"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
