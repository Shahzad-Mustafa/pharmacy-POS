import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { customFetch } from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Plus, Eye, CheckCircle, XCircle, Clock, DollarSign, FileText, Building2 } from "lucide-react";

type Claim = {
  id: string;
  status: string;
  claim_amount: number;
  patient_copay: number;
  approved_amount?: number;
  created_at: string;
  patient_id?: string;
  provider_id: string;
};

type Provider = {
  id: string;
  name: string;
  type: string;
  is_cashless: boolean;
  is_active: boolean;
};

type ClaimsResponse = { data: Claim[]; pagination: any };
type SummaryResponse = { total_submitted: number; total_approved: number; total_pending: number; total_amount: number; approved_amount: number };

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  submitted: "bg-blue-100 text-blue-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  partial: "bg-orange-100 text-orange-800",
  disputed: "bg-purple-100 text-purple-800",
};

function StatCard({ title, value, icon: Icon, sub }: { title: string; value: string; icon: any; sub?: string }) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{title}</p>
          <p className="text-xl font-bold">{value}</p>
          {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

function ClaimDetail({ claimId, onClose }: { claimId: string; onClose: () => void }) {
  const { data: claim, isLoading } = useQuery<Claim>({
    queryKey: ["claim", claimId],
    queryFn: () => customFetch(`/api/insurance/claims/${claimId}`),
    enabled: !!claimId,
  });

  const { toast } = useToast();
  const qc = useQueryClient();

  const submitMutation = useMutation({
    mutationFn: () => customFetch(`/api/insurance/claims/${claimId}/submit`, { method: "POST" }),
    onSuccess: () => {
      toast({ title: "Claim submitted" });
      qc.invalidateQueries({ queryKey: ["insurance-claims"] });
      onClose();
    },
  });

  return (
    <Sheet open={!!claimId} onOpenChange={() => onClose()}>
      <SheetContent className="w-[480px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Claim Details</SheetTitle>
        </SheetHeader>
        {isLoading ? (
          <div className="space-y-3 mt-4">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
          </div>
        ) : claim ? (
          <div className="mt-4 space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><p className="text-muted-foreground">Status</p>
                <Badge className={STATUS_COLORS[claim.status] ?? ""}>{claim.status}</Badge>
              </div>
              <div><p className="text-muted-foreground">Claim Amount</p>
                <p className="font-semibold">PKR {Number(claim.claim_amount).toLocaleString()}</p>
              </div>
              <div><p className="text-muted-foreground">Patient Copay</p>
                <p className="font-semibold">PKR {Number(claim.patient_copay).toLocaleString()}</p>
              </div>
              {claim.approved_amount != null && (
                <div><p className="text-muted-foreground">Approved Amount</p>
                  <p className="font-semibold text-green-600">PKR {Number(claim.approved_amount).toLocaleString()}</p>
                </div>
              )}
              <div><p className="text-muted-foreground">Date</p>
                <p>{new Date(claim.created_at).toLocaleDateString()}</p>
              </div>
            </div>
            {claim.status === "pending" && (
              <Button className="w-full" onClick={() => submitMutation.mutate()} disabled={submitMutation.isPending}>
                {submitMutation.isPending ? "Submitting…" : "Submit Claim"}
              </Button>
            )}
          </div>
        ) : <p className="text-muted-foreground mt-4">Claim not found.</p>}
      </SheetContent>
    </Sheet>
  );
}

function CreateProviderDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [form, setForm] = useState({ name: "", type: "private", adapter: "generic", is_cashless: false, is_active: true });

  const createMutation = useMutation({
    mutationFn: () => customFetch("/api/insurance/providers", { method: "POST", body: JSON.stringify(form) }),
    onSuccess: () => {
      toast({ title: "Provider created" });
      qc.invalidateQueries({ queryKey: ["insurance-providers"] });
      onClose();
    },
    onError: () => toast({ title: "Failed to create provider", variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader><DialogTitle>Add Insurance Provider</DialogTitle></DialogHeader>
        <div className="space-y-3 mt-2">
          <div><Label>Name</Label>
            <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. State Life Insurance" />
          </div>
          <div><Label>Type</Label>
            <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="private">Private</SelectItem>
                <SelectItem value="government">Government</SelectItem>
                <SelectItem value="tpa">TPA</SelectItem>
                <SelectItem value="sehat_sahulat">Sehat Sahulat</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label>Adapter</Label>
            <Select value={form.adapter} onValueChange={v => setForm(f => ({ ...f, adapter: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="generic">Generic</SelectItem>
                <SelectItem value="sehat_sahulat">Sehat Sahulat</SelectItem>
                <SelectItem value="eobi">EOBI</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="cashless" checked={form.is_cashless} onChange={e => setForm(f => ({ ...f, is_cashless: e.target.checked }))} />
            <Label htmlFor="cashless">Cashless Claims</Label>
          </div>
          <Button className="w-full" onClick={() => createMutation.mutate()} disabled={createMutation.isPending || !form.name}>
            {createMutation.isPending ? "Creating…" : "Create Provider"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function Insurance() {
  const { user } = useAuth();
  const branchId = user?.branch_id;
  const [selectedClaimId, setSelectedClaimId] = useState<string | null>(null);
  const [showCreateProvider, setShowCreateProvider] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: claimsData, isLoading: claimsLoading } = useQuery<ClaimsResponse>({
    queryKey: ["insurance-claims", statusFilter, branchId],
    queryFn: () => {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (branchId) params.set("branch_id", branchId);
      return customFetch(`/api/insurance/claims?${params}`);
    },
  });

  const { data: providersData, isLoading: providersLoading } = useQuery<{ data: Provider[] }>({
    queryKey: ["insurance-providers"],
    queryFn: () => customFetch("/api/insurance/providers"),
  });

  const { data: summary } = useQuery<SummaryResponse>({
    queryKey: ["insurance-summary", branchId],
    queryFn: () => {
      const params = new URLSearchParams();
      if (branchId) params.set("branch_id", branchId);
      return customFetch(`/api/insurance/claims/summary?${params}`);
    },
  });

  const { data: receivables } = useQuery<any>({
    queryKey: ["insurance-receivables"],
    queryFn: () => customFetch("/api/insurance/receivables"),
  });

  const claims = (claimsData as any)?.data ?? [];
  const providers = (providersData as any)?.data ?? [];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Insurance & Claims</h1>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="Total Submitted" value={String(summary?.total_submitted ?? 0)} icon={FileText} />
        <StatCard title="Approved" value={String(summary?.total_approved ?? 0)} icon={CheckCircle} />
        <StatCard title="Pending" value={String(summary?.total_pending ?? 0)} icon={Clock} />
        <StatCard
          title="Approved Amount"
          value={`PKR ${(summary?.approved_amount ?? 0).toLocaleString()}`}
          icon={DollarSign}
          sub={`of PKR ${(summary?.total_amount ?? 0).toLocaleString()} claimed`}
        />
      </div>

      <Tabs defaultValue="claims">
        <TabsList>
          <TabsTrigger value="claims">Claims</TabsTrigger>
          <TabsTrigger value="providers">Providers</TabsTrigger>
          <TabsTrigger value="receivables">Receivables</TabsTrigger>
        </TabsList>

        {/* Claims Tab */}
        <TabsContent value="claims" className="mt-4 space-y-3">
          <div className="flex items-center gap-3">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Filter status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="submitted">Submitted</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="partial">Partial</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Card>
            <CardContent className="p-0">
              {claimsLoading ? (
                <div className="p-4 space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Claim ID</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Claim Amount</TableHead>
                      <TableHead>Copay</TableHead>
                      <TableHead>Approved</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {claims.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-8">No claims found</TableCell>
                      </TableRow>
                    ) : claims.map((c: Claim) => (
                      <TableRow key={c.id} className="cursor-pointer hover:bg-muted/50">
                        <TableCell className="font-mono text-xs">{c.id.slice(0, 8)}…</TableCell>
                        <TableCell>
                          <Badge className={STATUS_COLORS[c.status] ?? ""}>{c.status}</Badge>
                        </TableCell>
                        <TableCell>PKR {Number(c.claim_amount).toLocaleString()}</TableCell>
                        <TableCell>PKR {Number(c.patient_copay).toLocaleString()}</TableCell>
                        <TableCell>{c.approved_amount != null ? `PKR ${Number(c.approved_amount).toLocaleString()}` : "—"}</TableCell>
                        <TableCell className="text-sm">{new Date(c.created_at).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Button size="sm" variant="ghost" onClick={() => setSelectedClaimId(c.id)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Providers Tab */}
        <TabsContent value="providers" className="mt-4 space-y-3">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setShowCreateProvider(true)}>
              <Plus className="h-4 w-4 mr-1" /> Add Provider
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {providersLoading ? (
              Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32 w-full" />)
            ) : providers.length === 0 ? (
              <div className="col-span-3 text-center text-muted-foreground py-12">No insurance providers configured</div>
            ) : providers.map((p: Provider) => (
              <Card key={p.id}>
                <CardContent className="p-4 flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-blue-100">
                    <Building2 className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{p.name}</p>
                    <p className="text-xs text-muted-foreground capitalize">{p.type}</p>
                    <div className="flex gap-2 mt-2">
                      <Badge variant={p.is_active ? "default" : "secondary"} className="text-xs">
                        {p.is_active ? "Active" : "Inactive"}
                      </Badge>
                      {p.is_cashless && <Badge variant="outline" className="text-xs">Cashless</Badge>}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Receivables Tab */}
        <TabsContent value="receivables" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Insurance Receivables</CardTitle>
            </CardHeader>
            <CardContent>
              {!receivables ? (
                <Skeleton className="h-32 w-full" />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Provider</TableHead>
                      <TableHead>Claims</TableHead>
                      <TableHead>Total Claimed</TableHead>
                      <TableHead>Received</TableHead>
                      <TableHead>Outstanding</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {((receivables as any)?.providers ?? []).length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-8">No receivables data</TableCell>
                      </TableRow>
                    ) : ((receivables as any)?.providers ?? []).map((r: any) => (
                      <TableRow key={r.provider_id}>
                        <TableCell>{r.provider_name}</TableCell>
                        <TableCell>{r.claim_count}</TableCell>
                        <TableCell>PKR {Number(r.total_claimed ?? 0).toLocaleString()}</TableCell>
                        <TableCell className="text-green-600">PKR {Number(r.received ?? 0).toLocaleString()}</TableCell>
                        <TableCell className="text-red-600 font-semibold">PKR {Number(r.outstanding ?? 0).toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {selectedClaimId && <ClaimDetail claimId={selectedClaimId} onClose={() => setSelectedClaimId(null)} />}
      <CreateProviderDialog open={showCreateProvider} onClose={() => setShowCreateProvider(false)} />
    </div>
  );
}
