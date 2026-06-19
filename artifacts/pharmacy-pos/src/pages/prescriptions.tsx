import { useState } from "react";
import {
  useListPrescriptions,
  getListPrescriptionsQueryKey,
  useCreatePrescription,
  useVerifyPrescription,
  useDispensePrescription,
  useGetPrescriptionStats,
  getGetPrescriptionStatsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, Package, FileText } from "lucide-react";
import { PageHeader } from "@/components/page-header";

const STATUS_CONFIG: Record<string, { label: string; variant: any; color: string }> = {
  received:  { label: "Received",  variant: "outline",     color: "text-yellow-600 border-yellow-300 bg-yellow-50" },
  verified:  { label: "Verified",  variant: "secondary",   color: "text-blue-600 border-blue-300 bg-blue-50" },
  filled:    { label: "Filled",    variant: "secondary",   color: "text-purple-600 border-purple-300 bg-purple-50" },
  dispensed: { label: "Dispensed", variant: "default",     color: "text-green-600 border-green-300 bg-green-50" },
  collected: { label: "Collected", variant: "secondary",   color: "text-gray-600 border-gray-300 bg-gray-50" },
};

export default function Prescriptions() {
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [page, setPage] = useState(1);
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading } = useListPrescriptions({
    status: statusFilter || undefined,
    branch_id: user?.branch_id ?? undefined,
    page,
  });

  const { data: stats } = useGetPrescriptionStats(
    { branch_id: user?.branch_id ?? undefined },
    { query: { queryKey: getGetPrescriptionStatsQueryKey({ branch_id: user?.branch_id ?? undefined }) } }
  );

  const verifyRx = useVerifyPrescription();
  const dispenseRx = useDispensePrescription();

  const invalidate = () => queryClient.invalidateQueries({ queryKey: getListPrescriptionsQueryKey() });

  const handleVerify = (id: string) => {
    verifyRx.mutate({ prescriptionId: id, data: { interaction_check_passed: true } }, {
      onSuccess: () => { toast({ title: "Prescription verified" }); invalidate(); },
      onError: () => toast({ title: "Failed to verify", variant: "destructive" }),
    });
  };

  const handleDispense = (id: string) => {
    dispenseRx.mutate({ prescriptionId: id, data: { dispensed_to: "Counter" } }, {
      onSuccess: () => { toast({ title: "Prescription dispensed" }); invalidate(); },
      onError: () => toast({ title: "Failed to dispense", variant: "destructive" }),
    });
  };

  const prescriptions = (data as any)?.data ?? [];
  const total = (data as any)?.total ?? 0;
  const totalPages = (data as any)?.total_pages ?? 1;
  const byStatus = (stats as any)?.by_status ?? {};

  return (
    <div className="space-y-6">
      <PageHeader
        title="Prescription Queue"
        subtitle="Manage and dispense prescriptions"
        icon={FileText}
        gradient="from-cyan-600 via-cyan-500 to-teal-500"
      />

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {Object.entries(STATUS_CONFIG).map(([status, cfg]) => (
          <Card
            key={status}
            className="cursor-pointer hover:border-primary transition-colors"
            onClick={() => setStatusFilter(statusFilter === status ? "" : status)}
            data-testid={`card-status-${status}`}
          >
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold">{byStatus[status] ?? 0}</p>
              <p className="text-xs text-muted-foreground mt-1">{cfg.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Prescriptions ({total})</CardTitle>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v === "all" ? "" : v); setPage(1); }}>
              <SelectTrigger className="w-[160px]" data-testid="select-status-filter">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                  <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
          ) : (
            <div className="overflow-x-auto">

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Prescription #</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>Prescriber</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {prescriptions.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-12">No prescriptions found</TableCell></TableRow>
                ) : prescriptions.map((rx: any) => {
                  const cfg = STATUS_CONFIG[rx.status] ?? { label: rx.status, color: "" };
                  const items = Array.isArray(rx.items) ? rx.items : [];
                  return (
                    <TableRow key={rx.id} data-testid={`row-prescription-${rx.id}`}>
                      <TableCell className="font-mono text-sm">{rx.prescription_number ?? rx.prescriptionNumber ?? rx.id.slice(0, 8).toUpperCase()}</TableCell>
                      <TableCell>
                        <div className="font-medium">{rx.patient_name ?? "Walk-in"}</div>
                      </TableCell>
                      <TableCell className="text-sm">{rx.prescriber_name ?? rx.prescriberName ?? "—"}</TableCell>
                      <TableCell className="text-sm">{rx.prescription_date ?? rx.prescriptionDate}</TableCell>
                      <TableCell className="text-sm">{items.length} item{items.length !== 1 ? "s" : ""}</TableCell>
                      <TableCell>
                        <Badge className={cfg.color}>{cfg.label}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {rx.status === "received" && (
                            <Button size="sm" variant="outline" onClick={() => handleVerify(rx.id)} disabled={verifyRx.isPending} data-testid={`button-verify-${rx.id}`}>
                              <CheckCircle className="h-3 w-3 mr-1" /> Verify
                            </Button>
                          )}
                          {(rx.status === "verified" || rx.status === "filled") && (
                            <Button size="sm" onClick={() => handleDispense(rx.id)} disabled={dispenseRx.isPending} data-testid={`button-dispense-${rx.id}`}>
                              <Package className="h-3 w-3 mr-1" /> Dispense
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            </div>
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
    </div>
  );
}
