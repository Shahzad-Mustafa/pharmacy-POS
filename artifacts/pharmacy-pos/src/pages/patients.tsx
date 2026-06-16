import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  useListPatients,
  getListPatientsQueryKey,
  useCreatePatient,
  useUpdatePatient,
  useGetPatient,
  useGetPatientHistory,
  getGetPatientQueryKey,
  getGetPatientHistoryQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, User, Phone, AlertTriangle } from "lucide-react";

const patientSchema = z.object({
  name: z.string().min(1, "Name required"),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  cnic: z.string().optional(),
  gender: z.string().optional(),
  dob: z.string().optional(),
  address: z.string().optional(),
  blood_group: z.string().optional(),
  customer_type: z.enum(["retail", "hospital"]).default("retail"),
  allergies: z.string().optional(),
  chronic_conditions: z.string().optional(),
  chronic_medications: z.string().optional(),
  mrn: z.string().optional(),
  ward: z.string().optional(),
});

type PatientFormValues = z.infer<typeof patientSchema>;

function PatientDetail({ patientId, onClose }: { patientId: string; onClose: () => void }) {
  const { data: patient, isLoading } = useGetPatient(patientId, {
    query: { enabled: !!patientId, queryKey: getGetPatientQueryKey(patientId) },
  });
  const { data: history, isLoading: histLoading } = useGetPatientHistory(patientId, {
    query: { enabled: !!patientId, queryKey: getGetPatientHistoryQueryKey(patientId) },
  });
  const p = patient as any;
  const h = history as any;

  return (
    <Sheet open={!!patientId} onOpenChange={() => onClose()}>
      <SheetContent className="w-[500px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Patient Profile</SheetTitle>
        </SheetHeader>
        {isLoading ? (
          <div className="space-y-3 mt-4">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}</div>
        ) : p && (
          <div className="space-y-6 mt-4">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-7 w-7 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-bold" data-testid="text-patient-name">{p.name}</h2>
                <p className="text-sm text-muted-foreground">{p.customer_type === "hospital" ? "Hospital Patient" : "Retail Customer"}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              {p.phone && <div><span className="text-muted-foreground">Phone</span><p className="font-medium">{p.phone}</p></div>}
              {p.cnic && <div><span className="text-muted-foreground">CNIC</span><p className="font-medium">{p.cnic}</p></div>}
              {p.gender && <div><span className="text-muted-foreground">Gender</span><p className="font-medium">{p.gender}</p></div>}
              {p.dob && <div><span className="text-muted-foreground">Date of Birth</span><p className="font-medium">{p.dob}</p></div>}
              {p.blood_group && <div><span className="text-muted-foreground">Blood Group</span><p className="font-medium">{p.blood_group}</p></div>}
              {p.mrn && <div><span className="text-muted-foreground">MRN</span><p className="font-medium">{p.mrn}</p></div>}
              {p.ward && <div><span className="text-muted-foreground">Ward</span><p className="font-medium">{p.ward}</p></div>}
            </div>

            {p.allergies?.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  <span className="text-sm font-semibold text-destructive">Allergies</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {p.allergies.map((a: string) => <Badge key={a} variant="destructive" className="text-xs">{a}</Badge>)}
                </div>
              </div>
            )}

            {p.chronic_conditions?.length > 0 && (
              <div>
                <p className="text-sm font-semibold mb-2">Chronic Conditions</p>
                <div className="flex flex-wrap gap-2">
                  {p.chronic_conditions.map((c: string) => <Badge key={c} variant="secondary">{c}</Badge>)}
                </div>
              </div>
            )}

            {p.chronic_medications?.length > 0 && (
              <div>
                <p className="text-sm font-semibold mb-2">Regular Medications</p>
                <div className="flex flex-wrap gap-2">
                  {p.chronic_medications.map((m: string) => <Badge key={m} variant="outline">{m}</Badge>)}
                </div>
              </div>
            )}

            <Separator />
            <div>
              <p className="text-sm font-semibold mb-3">Purchase History</p>
              {histLoading ? <Skeleton className="h-20 w-full" /> : (
                <div className="space-y-2">
                  {h?.sales?.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No purchases recorded</p>
                  ) : h?.sales?.map((s: any) => (
                    <div key={s.id} className="flex justify-between text-sm border rounded-md p-2">
                      <span className="font-mono text-muted-foreground">{s.invoiceNumber ?? s.invoice_number}</span>
                      <span className="font-medium">Rs. {Number(s.total).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

export default function Patients() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [editPatient, setEditPatient] = useState<any>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading } = useListPatients({ page, per_page: 20 });
  const createPatient = useCreatePatient();
  const updatePatient = useUpdatePatient();

  const form = useForm<PatientFormValues>({
    resolver: zodResolver(patientSchema),
    defaultValues: { name: "", customer_type: "retail" },
  });

  const openCreate = () => {
    setEditPatient(null);
    form.reset({ name: "", customer_type: "retail" });
    setOpen(true);
  };

  const openEdit = (p: any) => {
    setEditPatient(p);
    form.reset({
      name: p.name,
      phone: p.phone ?? "",
      email: p.email ?? "",
      cnic: p.cnic ?? "",
      gender: p.gender ?? "",
      dob: p.dob ?? "",
      address: p.address ?? "",
      blood_group: p.blood_group ?? p.bloodGroup ?? "",
      customer_type: p.customer_type ?? p.customerType ?? "retail",
      allergies: (p.allergies ?? []).join(", "),
      chronic_conditions: (p.chronic_conditions ?? p.chronicConditions ?? []).join(", "),
      chronic_medications: (p.chronic_medications ?? p.chronicMedications ?? []).join(", "),
      mrn: p.mrn ?? "",
      ward: p.ward ?? "",
    });
    setOpen(true);
  };

  const onSubmit = (values: PatientFormValues) => {
    const payload = {
      ...values,
      allergies: values.allergies ? values.allergies.split(",").map((s) => s.trim()).filter(Boolean) : [],
      chronic_conditions: values.chronic_conditions ? values.chronic_conditions.split(",").map((s) => s.trim()).filter(Boolean) : [],
      chronic_medications: values.chronic_medications ? values.chronic_medications.split(",").map((s) => s.trim()).filter(Boolean) : [],
    };

    if (editPatient) {
      updatePatient.mutate({ patientId: editPatient.id, data: payload as any }, {
        onSuccess: () => {
          toast({ title: "Patient updated" });
          setOpen(false);
          queryClient.invalidateQueries({ queryKey: getListPatientsQueryKey() });
        },
        onError: () => toast({ title: "Failed to update", variant: "destructive" }),
      });
    } else {
      createPatient.mutate({ data: payload as any }, {
        onSuccess: () => {
          toast({ title: "Patient registered" });
          setOpen(false);
          queryClient.invalidateQueries({ queryKey: getListPatientsQueryKey() });
        },
        onError: () => toast({ title: "Failed to register", variant: "destructive" }),
      });
    }
  };

  const patients = (data as any)?.data ?? [];
  const total = (data as any)?.total ?? 0;
  const totalPages = (data as any)?.total_pages ?? 1;

  return (
    <div className="space-y-6">
      {selectedPatientId && (
        <PatientDetail patientId={selectedPatientId} onClose={() => setSelectedPatientId(null)} />
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Patient Registry</h1>
          <p className="text-muted-foreground mt-1">{total} patients registered</p>
        </div>
        <Button onClick={openCreate} data-testid="button-add-patient">
          <Plus className="h-4 w-4 mr-2" /> Register Patient
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, phone, CNIC..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              data-testid="input-patient-search"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Patient</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>CNIC</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Allergies</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {patients.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-12">No patients found</TableCell></TableRow>
                ) : patients.map((p: any) => (
                  <TableRow
                    key={p.id}
                    className="cursor-pointer"
                    onClick={() => setSelectedPatientId(p.id)}
                    data-testid={`row-patient-${p.id}`}
                  >
                    <TableCell>
                      <div className="font-medium">{p.name}</div>
                      {p.chronic_conditions?.length > 0 && (
                        <div className="text-xs text-muted-foreground">{(p.chronic_conditions ?? p.chronicConditions ?? []).join(", ")}</div>
                      )}
                    </TableCell>
                    <TableCell>{p.phone ?? "—"}</TableCell>
                    <TableCell className="font-mono text-sm">{p.cnic ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant={(p.customer_type ?? p.customerType) === "hospital" ? "default" : "outline"}>
                        {(p.customer_type ?? p.customerType) === "hospital" ? "Hospital" : "Retail"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {(p.allergies ?? []).length > 0 ? (
                        <div className="flex gap-1">
                          <AlertTriangle className="h-3 w-3 text-destructive" />
                          <span className="text-xs text-destructive">{(p.allergies ?? []).join(", ")}</span>
                        </div>
                      ) : "—"}
                    </TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <Button size="sm" variant="ghost" onClick={() => openEdit(p)} data-testid={`button-edit-patient-${p.id}`}>Edit</Button>
                    </TableCell>
                  </TableRow>
                ))}
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

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editPatient ? "Edit Patient" : "Register Patient"}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem className="col-span-2">
                  <FormLabel>Full Name *</FormLabel>
                  <FormControl><Input {...field} data-testid="input-patient-name" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="phone" render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="cnic" render={({ field }) => (
                <FormItem>
                  <FormLabel>CNIC</FormLabel>
                  <FormControl><Input placeholder="XXXXX-XXXXXXX-X" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="gender" render={({ field }) => (
                <FormItem>
                  <FormLabel>Gender</FormLabel>
                  <FormControl>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Male">Male</SelectItem>
                        <SelectItem value="Female">Female</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="dob" render={({ field }) => (
                <FormItem>
                  <FormLabel>Date of Birth</FormLabel>
                  <FormControl><Input type="date" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="blood_group" render={({ field }) => (
                <FormItem>
                  <FormLabel>Blood Group</FormLabel>
                  <FormControl>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        {["A+","A-","B+","B-","O+","O-","AB+","AB-"].map((bg) => (
                          <SelectItem key={bg} value={bg}>{bg}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="customer_type" render={({ field }) => (
                <FormItem>
                  <FormLabel>Patient Type</FormLabel>
                  <FormControl>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="retail">Retail</SelectItem>
                        <SelectItem value="hospital">Hospital</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="address" render={({ field }) => (
                <FormItem className="col-span-2">
                  <FormLabel>Address</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="allergies" render={({ field }) => (
                <FormItem className="col-span-2">
                  <FormLabel>Allergies (comma separated)</FormLabel>
                  <FormControl><Input placeholder="e.g. Penicillin, Sulfa" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="chronic_conditions" render={({ field }) => (
                <FormItem className="col-span-2">
                  <FormLabel>Chronic Conditions (comma separated)</FormLabel>
                  <FormControl><Input placeholder="e.g. Hypertension, Diabetes" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <div className="col-span-2 flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={createPatient.isPending || updatePatient.isPending} data-testid="button-submit-patient">
                  {createPatient.isPending || updatePatient.isPending ? "Saving..." : editPatient ? "Update" : "Register"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
