import { useState } from "react";
import {
  useListSales,
  getListSalesQueryKey,
  useGetSale,
  getGetSaleQueryKey,
  useRefundSale,
  useGetSalesKpis,
  getGetSalesKpisQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { DollarSign, Receipt, RotateCcw } from "lucide-react";

function SaleDetail({ saleId, onClose }: { saleId: string; onClose: () => void }) {
  const { data: sale, isLoading } = useGetSale(saleId, {
    query: { enabled: !!saleId, queryKey: getGetSaleQueryKey(saleId) },
  });
  const refund = useRefundSale();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const s = sale as any;

  const handleRefund = () => {
    if (!confirm("Refund this sale?")) return;
    refund.mutate({ saleId, data: { items: [], refund_method: "cash", restock: true } }, {
      onSuccess: () => {
        toast({ title: "Sale refunded" });
        queryClient.invalidateQueries({ queryKey: getListSalesQueryKey() });
        onClose();
      },
      onError: () => toast({ title: "Refund failed", variant: "destructive" }),
    });
  };

  return (
    <Sheet open={!!saleId} onOpenChange={() => onClose()}>
      <SheetContent className="w-[480px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Sale Details</SheetTitle>
        </SheetHeader>
        {isLoading ? <Skeleton className="h-64 w-full mt-4" /> : s && (
          <div className="space-y-6 mt-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-mono text-lg font-bold" data-testid="text-invoice-number">{s.invoiceNumber ?? s.invoice_number}</p>
                <p className="text-sm text-muted-foreground">{new Date(s.createdAt ?? s.created_at).toLocaleString()}</p>
              </div>
              <Badge variant={s.status === "completed" ? "default" : s.status === "refunded" ? "destructive" : "secondary"}>
                {s.status}
              </Badge>
            </div>

            {s.patient_name && <p className="text-sm"><span className="text-muted-foreground">Patient: </span>{s.patient_name}</p>}

            <div>
              <p className="text-sm font-semibold mb-2">Items</p>
              <div className="space-y-1">
                {(Array.isArray(s.items) ? s.items : []).map((item: any, i: number) => (
                  <div key={i} className="flex justify-between text-sm" data-testid={`item-sale-${i}`}>
                    <span>{item.medicine_name ?? "Item"} x{item.quantity}</span>
                    <span className="font-mono">Rs. {Number(item.line_total ?? 0).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>

            <Separator />
            <div className="space-y-1 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>Rs. {Number(s.subtotal).toFixed(2)}</span></div>
              {Number(s.discount) > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Discount</span><span className="text-green-600">- Rs. {Number(s.discount).toFixed(2)}</span></div>}
              {Number(s.tax) > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Tax</span><span>Rs. {Number(s.tax).toFixed(2)}</span></div>}
              <div className="flex justify-between font-bold text-base"><span>Total</span><span>Rs. {Number(s.total).toFixed(2)}</span></div>
            </div>

            <div className="text-sm space-y-1">
              <div className="flex justify-between"><span className="text-muted-foreground">Payment Method</span><span className="capitalize">{s.paymentMethod ?? s.payment_method}</span></div>
              {s.amount_tendered && <div className="flex justify-between"><span className="text-muted-foreground">Tendered</span><span>Rs. {Number(s.amountTendered ?? s.amount_tendered).toFixed(2)}</span></div>}
              {s.change && Number(s.change) > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Change</span><span>Rs. {Number(s.change).toFixed(2)}</span></div>}
            </div>

            {s.status === "completed" && (
              <Button variant="destructive" className="w-full" onClick={handleRefund} disabled={refund.isPending} data-testid="button-refund-sale">
                <RotateCcw className="h-4 w-4 mr-2" /> Process Refund
              </Button>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

export default function Sales() {
  const [page, setPage] = useState(1);
  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const { user } = useAuth();

  const { data, isLoading } = useListSales({
    branch_id: user?.branch_id ?? undefined,
    status: statusFilter || undefined,
    from: dateFrom || undefined,
    to: dateTo || undefined,
    page,
    per_page: 20,
  });

  const { data: kpis } = useGetSalesKpis(
    { branch_id: user?.branch_id ?? undefined },
    { query: { queryKey: getGetSalesKpisQueryKey({ branch_id: user?.branch_id ?? undefined }) } }
  );

  const k = kpis as any;
  const sales = (data as any)?.data ?? [];
  const total = (data as any)?.total ?? 0;
  const totalPages = (data as any)?.total_pages ?? 1;

  return (
    <div className="space-y-6">
      {selectedSaleId && <SaleDetail saleId={selectedSaleId} onClose={() => setSelectedSaleId(null)} />}

      <div>
        <h1 className="text-3xl font-bold tracking-tight">Sales History</h1>
        <p className="text-muted-foreground mt-1">Transaction records and refunds</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-md"><DollarSign className="h-5 w-5 text-primary" /></div>
            <div>
              <p className="text-xs text-muted-foreground">Today Revenue</p>
              <p className="text-xl font-bold">Rs. {Number(k?.revenue_today ?? 0).toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-md"><Receipt className="h-5 w-5 text-primary" /></div>
            <div>
              <p className="text-xs text-muted-foreground">Transactions Today</p>
              <p className="text-xl font-bold">{k?.transactions_today ?? 0}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-md"><DollarSign className="h-5 w-5 text-primary" /></div>
            <div>
              <p className="text-xs text-muted-foreground">Avg. Transaction</p>
              <p className="text-xl font-bold">Rs. {Number(k?.avg_transaction ?? 0).toFixed(2)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap gap-3 items-center">
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v === "all" ? "" : v); setPage(1); }}>
              <SelectTrigger className="w-[140px]" data-testid="select-sales-status">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="refunded">Refunded</SelectItem>
                <SelectItem value="held">On Hold</SelectItem>
              </SelectContent>
            </Select>
            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-[150px]" data-testid="input-date-from" />
            <span className="text-muted-foreground text-sm">to</span>
            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-[150px]" data-testid="input-date-to" />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">{[...Array(8)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sales.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-12">No sales found</TableCell></TableRow>
                ) : sales.map((s: any) => (
                  <TableRow key={s.id} className="cursor-pointer" onClick={() => setSelectedSaleId(s.id)} data-testid={`row-sale-${s.id}`}>
                    <TableCell className="font-mono text-sm">{s.invoiceNumber ?? s.invoice_number}</TableCell>
                    <TableCell>{s.patient_name ?? (s.patient_id ?? s.patientId ? "Patient" : "Walk-in")}</TableCell>
                    <TableCell><Badge variant="outline" className="text-xs capitalize">{s.saleType ?? s.sale_type}</Badge></TableCell>
                    <TableCell className="capitalize text-sm">{s.paymentMethod ?? s.payment_method}</TableCell>
                    <TableCell className="font-mono font-medium">Rs. {Number(s.total).toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge variant={s.status === "completed" ? "default" : s.status === "refunded" ? "destructive" : "secondary"}>
                        {s.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(s.createdAt ?? s.created_at).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t">
              <p className="text-sm text-muted-foreground">Page {page} of {totalPages} ({total} total)</p>
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
