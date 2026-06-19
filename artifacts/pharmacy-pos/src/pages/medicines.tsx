import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  useListMedicines,
  getListMedicinesQueryKey,
  useCreateMedicine,
  useUpdateMedicine,
  useDeactivateMedicine,
  useGetMedicineCategories,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, Edit, Trash2, Pill } from "lucide-react";
import { PageHeader } from "@/components/page-header";

const medicineSchema = z.object({
  name: z.string().min(1, "Name required"),
  generic_name: z.string().optional(),
  brand: z.string().optional(),
  category: z.string().optional(),
  strength: z.string().optional(),
  form: z.string().optional(),
  manufacturer: z.string().optional(),
  mrp: z.coerce.number().min(0, "MRP must be positive"),
  requires_prescription: z.boolean().default(false),
  min_stock_level: z.coerce.number().optional(),
  reorder_point: z.coerce.number().optional(),
  barcode: z.string().optional(),
});

type MedicineFormValues = z.infer<typeof medicineSchema>;

export default function Medicines() {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [open, setOpen] = useState(false);
  const [editMedicine, setEditMedicine] = useState<any>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading } = useListMedicines({ q: search || undefined, category: categoryFilter || undefined, page, per_page: perPage });
  const { data: categories } = useGetMedicineCategories();
  const createMed = useCreateMedicine();
  const updateMed = useUpdateMedicine();
  const deactivateMed = useDeactivateMedicine();

  const form = useForm<MedicineFormValues>({
    resolver: zodResolver(medicineSchema),
    defaultValues: { name: "", requires_prescription: false, mrp: 0 },
  });

  const openEdit = (med: any) => {
    setEditMedicine(med);
    form.reset({
      name: med.name,
      generic_name: med.genericName ?? med.generic_name ?? "",
      brand: med.brand ?? "",
      category: med.category ?? "",
      strength: med.strength ?? "",
      form: med.form ?? "",
      manufacturer: med.manufacturer ?? "",
      mrp: Number(med.mrp),
      requires_prescription: med.requiresPrescription ?? med.requires_prescription ?? false,
      min_stock_level: med.minStockLevel ?? med.min_stock_level ?? undefined,
    });
    setOpen(true);
  };

  const openCreate = () => {
    setEditMedicine(null);
    form.reset({ name: "", requires_prescription: false, mrp: 0 });
    setOpen(true);
  };

  const onSubmit = (values: MedicineFormValues) => {
    if (editMedicine) {
      updateMed.mutate(
        { medicineId: editMedicine.id, data: values as any },
        {
          onSuccess: () => {
            toast({ title: "Medicine updated" });
            setOpen(false);
            queryClient.invalidateQueries({ queryKey: getListMedicinesQueryKey() });
          },
          onError: () => toast({ title: "Failed to update", variant: "destructive" }),
        }
      );
    } else {
      createMed.mutate(
        { data: values as any },
        {
          onSuccess: () => {
            toast({ title: "Medicine added" });
            setOpen(false);
            queryClient.invalidateQueries({ queryKey: getListMedicinesQueryKey() });
          },
          onError: () => toast({ title: "Failed to add medicine", variant: "destructive" }),
        }
      );
    }
  };

  const handleDeactivate = (id: string, name: string) => {
    if (!confirm(`Deactivate "${name}"?`)) return;
    deactivateMed.mutate(
      { medicineId: id },
      {
        onSuccess: () => {
          toast({ title: "Medicine deactivated" });
          queryClient.invalidateQueries({ queryKey: getListMedicinesQueryKey() });
        },
      }
    );
  };

  const medicines = (data as any)?.data ?? [];
  const total = (data as any)?.pagination?.total ?? 0;
  const totalPages = (data as any)?.pagination?.pages ?? 1;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Medicine Catalog"
        subtitle={`${total} medicines in system`}
        icon={Pill}
        gradient="from-emerald-600 via-emerald-500 to-teal-500"
        actions={
          <Button onClick={openCreate} className="bg-white text-emerald-700 hover:bg-emerald-50 font-semibold" data-testid="button-add-medicine">
            <Plus className="h-4 w-4 mr-2" /> Add Medicine
          </Button>
        }
      />

      <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editMedicine ? "Edit Medicine" : "Add Medicine"}</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Name *</FormLabel>
                    <FormControl><Input {...field} data-testid="input-medicine-name" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="generic_name" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Generic Name</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="brand" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Brand</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="strength" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Strength</FormLabel>
                    <FormControl><Input placeholder="e.g. 500mg" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="form" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Dosage Form</FormLabel>
                    <FormControl>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger><SelectValue placeholder="Select form" /></SelectTrigger>
                        <SelectContent>
                          {["Tablet","Capsule","Syrup","Injection","Inhaler","Cream","Drops","Suspension","Powder","Patch"].map((f) => (
                            <SelectItem key={f} value={f}>{f}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="category" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <FormControl><Input placeholder="e.g. Antibiotics" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="manufacturer" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Manufacturer</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="mrp" render={({ field }) => (
                  <FormItem>
                    <FormLabel>MRP (Rs.) *</FormLabel>
                    <FormControl><Input type="number" step="0.01" {...field} data-testid="input-medicine-mrp" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="min_stock_level" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Min Stock Level</FormLabel>
                    <FormControl><Input type="number" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="barcode" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Barcode</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="requires_prescription" render={({ field }) => (
                  <FormItem className="flex items-center gap-3 col-span-2 mt-2">
                    <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-requires-prescription" /></FormControl>
                    <FormLabel className="!mt-0">Requires Prescription</FormLabel>
                  </FormItem>
                )} />
                <div className="col-span-2 flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={createMed.isPending || updateMed.isPending} data-testid="button-submit-medicine">
                    {createMed.isPending || updateMed.isPending ? "Saving..." : editMedicine ? "Update" : "Add Medicine"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <div className="flex gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search medicines..."
                className="pl-9"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                data-testid="input-medicine-search"
              />
            </div>
            <Select value={categoryFilter} onValueChange={(v) => { setCategoryFilter(v === "all" ? "" : v); setPage(1); }}>
              <SelectTrigger className="w-[200px]" data-testid="select-category-filter">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {(categories as any[])?.map((c: any) => (
                  <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">{[...Array(8)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : (
            <div className="overflow-x-auto">

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Medicine</TableHead>
                  <TableHead className="hidden md:table-cell">Category</TableHead>
                  <TableHead className="hidden lg:table-cell">Strength / Form</TableHead>
                  <TableHead>MRP</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead className="hidden sm:table-cell">Expiry</TableHead>
                  <TableHead>Rx</TableHead>
                  <TableHead className="hidden sm:table-cell">Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {medicines.length === 0 ? (
                  <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-12">No medicines found</TableCell></TableRow>
                ) : medicines.map((med: any) => (
                  <TableRow key={med.id} data-testid={`row-medicine-${med.id}`}>
                    <TableCell>
                      <div className="font-medium">{med.name}</div>
                      <div className="text-xs text-muted-foreground">{med.genericName ?? med.generic_name}</div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell"><Badge variant="outline">{med.category ?? "—"}</Badge></TableCell>
                    <TableCell className="hidden lg:table-cell text-sm">{med.strength} {med.form && `· ${med.form}`}</TableCell>
                    <TableCell className="font-mono text-sm">Rs. {Number(med.mrp).toFixed(2)}</TableCell>
                    <TableCell>
                      <span className={(med.current_stock ?? 0) <= (med.min_stock_level ?? 10) && (med.current_stock ?? 0) > 0 ? "text-yellow-600 font-semibold" : (med.current_stock ?? 0) === 0 ? "text-destructive font-semibold" : ""}>
                        {med.current_stock ?? 0}
                      </span>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      {(() => {
                        const exp = med.nearest_expiry;
                        if (!exp) return <span className="text-muted-foreground text-xs">—</span>;
                        const today = new Date(); today.setHours(0,0,0,0);
                        const expDate = new Date(exp); expDate.setHours(0,0,0,0);
                        const diffDays = Math.floor((expDate.getTime() - today.getTime()) / 86400000);
                        const label = expDate.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
                        if (diffDays < 0) return <span className="text-red-600 font-semibold text-xs">{label}<br/><span className="text-red-400">Expired</span></span>;
                        if (diffDays <= 90) return <span className="text-orange-500 font-semibold text-xs">{label}<br/><span className="text-orange-400">{diffDays}d left</span></span>;
                        return <span className="text-xs">{label}</span>;
                      })()}
                    </TableCell>
                    <TableCell>
                      {(med.requiresPrescription ?? med.requires_prescription) ? (
                        <Badge variant="destructive" className="text-xs">Rx</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">OTC</Badge>
                      )}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <Badge variant={(med.isActive ?? med.is_active) ? "default" : "secondary"}>
                        {(med.isActive ?? med.is_active) ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="ghost" onClick={() => openEdit(med)} data-testid={`button-edit-medicine-${med.id}`}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleDeactivate(med.id, med.name)} data-testid={`button-deactivate-medicine-${med.id}`}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            </div>
          )}
          <div className="flex items-center justify-between px-4 py-3 border-t text-sm text-muted-foreground flex-wrap gap-2">
            <span>
              {total === 0
                ? "No medicines found"
                : `Showing ${(page - 1) * perPage + 1}–${Math.min(page * perPage, total)} of ${total} medicine${total !== 1 ? "s" : ""}`}
            </span>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs">Per page:</span>
                <Select
                  value={String(perPage)}
                  onValueChange={(v) => { setPerPage(Number(v)); setPage(1); }}
                >
                  <SelectTrigger className="h-8 w-20 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="25">25</SelectItem>
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
    </div>
  );
}
