import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { customFetch } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Save, Printer, Plus, TestTube, Shield, Receipt, Database, Settings2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";

type SystemSetting = { key: string; value: any; description?: string };
type TaxSetting = { tax_rate: number; tax_name: string; tax_included: boolean; tax_registration_number?: string };
type Printer = { id: string; name: string; type: string; ip?: string; port?: number; is_default: boolean; is_active: boolean; paper_width: number };
type ReceiptTemplate = { header?: string; footer?: string; show_logo: boolean; show_tax_breakdown: boolean; show_barcode: boolean; copies: number };

function GeneralSettings() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [form, setForm] = useState<Record<string, any>>({});

  const { data, isLoading } = useQuery<SystemSetting[]>({
    queryKey: ["system-settings"],
    queryFn: async () => {
      const res: any = await customFetch("/api/settings");
      const dict: Record<string, any> = res?.settings ?? res ?? {};
      return Object.entries(dict).map(([key, value]) => ({ key, value }));
    },
  });

  useEffect(() => {
    if (data && Array.isArray(data)) {
      const map: Record<string, any> = {};
      data.forEach((s: SystemSetting) => { map[s.key] = s.value?.v ?? s.value; });
      setForm(map);
    }
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: (payload: Record<string, any>) =>
      customFetch("/api/settings", { method: "PUT", body: JSON.stringify(payload) }),
    onSuccess: () => {
      toast({ title: "Settings saved" });
      qc.invalidateQueries({ queryKey: ["system-settings"] });
    },
    onError: () => toast({ title: "Failed to save settings", variant: "destructive" }),
  });

  if (isLoading) return <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label>Pharmacy Name</Label>
          <Input value={form.pharmacy_name ?? ""} onChange={e => setForm(f => ({ ...f, pharmacy_name: e.target.value }))} placeholder="RxPOS Pharmacy" />
        </div>
        <div className="space-y-1">
          <Label>Currency</Label>
          <Select value={form.currency ?? "PKR"} onValueChange={v => setForm(f => ({ ...f, currency: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="PKR">PKR — Pakistani Rupee</SelectItem>
              <SelectItem value="USD">USD — US Dollar</SelectItem>
              <SelectItem value="AED">AED — UAE Dirham</SelectItem>
              <SelectItem value="SAR">SAR — Saudi Riyal</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Low Stock Alert (days of cover)</Label>
          <Input type="number" value={form.low_stock_alert_days ?? 30} onChange={e => setForm(f => ({ ...f, low_stock_alert_days: Number(e.target.value) }))} />
        </div>
        <div className="space-y-1">
          <Label>Loyalty Points per PKR</Label>
          <Input type="number" value={form.loyalty_points_per_pkr ?? 0} onChange={e => setForm(f => ({ ...f, loyalty_points_per_pkr: Number(e.target.value) }))} step="0.01" />
        </div>
        <div className="space-y-1">
          <Label>Expiry Alert Days (comma-separated)</Label>
          <Input
            value={Array.isArray(form.expiry_alert_days) ? form.expiry_alert_days.join(", ") : (form.expiry_alert_days ?? "30, 60, 90")}
            onChange={e => setForm(f => ({ ...f, expiry_alert_days: e.target.value.split(",").map((n: string) => Number(n.trim())).filter(Boolean) }))}
            placeholder="30, 60, 90"
          />
        </div>
        <div className="space-y-1">
          <Label>Default Discount %</Label>
          <Input type="number" value={form.default_discount_pct ?? 0} onChange={e => setForm(f => ({ ...f, default_discount_pct: Number(e.target.value) }))} step="0.1" />
        </div>
      </div>
      <Button onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending}>
        <Save className="h-4 w-4 mr-2" />
        {saveMutation.isPending ? "Saving…" : "Save General Settings"}
      </Button>
    </div>
  );
}

function TaxSettings() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [form, setForm] = useState<TaxSetting>({ tax_rate: 0.17, tax_name: "GST", tax_included: false });

  const { data, isLoading } = useQuery<TaxSetting>({
    queryKey: ["tax-settings"],
    queryFn: async () => {
      const res: any = await customFetch("/api/settings/tax");
      const rule = res?.rules?.[0] ?? res ?? {};
      return {
        tax_rate: rule.tax_rate ?? 0.17,
        tax_name: rule.tax_name ?? "GST",
        tax_included: rule.tax_included ?? false,
        tax_registration_number: rule.tax_registration_number ?? "",
      };
    },
  });

  useEffect(() => { if (data) setForm(data as TaxSetting); }, [data]);

  const saveMutation = useMutation({
    mutationFn: (payload: TaxSetting) =>
      customFetch("/api/settings/tax", { method: "PUT", body: JSON.stringify(payload) }),
    onSuccess: () => {
      toast({ title: "Tax settings saved" });
      qc.invalidateQueries({ queryKey: ["tax-settings"] });
    },
    onError: () => toast({ title: "Failed to save tax settings", variant: "destructive" }),
  });

  if (isLoading) return <Skeleton className="h-48 w-full" />;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label>Tax Name</Label>
          <Input value={form.tax_name} onChange={e => setForm(f => ({ ...f, tax_name: e.target.value }))} placeholder="GST" />
        </div>
        <div className="space-y-1">
          <Label>Tax Rate (0–1, e.g. 0.17 = 17%)</Label>
          <Input type="number" step="0.01" min="0" max="1" value={form.tax_rate} onChange={e => setForm(f => ({ ...f, tax_rate: Number(e.target.value) }))} />
          <p className="text-xs text-muted-foreground">{(form.tax_rate * 100).toFixed(1)}%</p>
        </div>
        <div className="space-y-1">
          <Label>NTN / Tax Registration Number</Label>
          <Input value={form.tax_registration_number ?? ""} onChange={e => setForm(f => ({ ...f, tax_registration_number: e.target.value }))} placeholder="1234567-8" />
        </div>
        <div className="flex items-center gap-3 pt-4">
          <Switch checked={form.tax_included} onCheckedChange={v => setForm(f => ({ ...f, tax_included: v }))} id="tax-inc" />
          <Label htmlFor="tax-inc">Tax Included in Price (tax-inclusive pricing)</Label>
        </div>
      </div>
      <Button onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending}>
        <Save className="h-4 w-4 mr-2" />
        {saveMutation.isPending ? "Saving…" : "Save Tax Settings"}
      </Button>
    </div>
  );
}

function PrinterSettings() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [newPrinter, setNewPrinter] = useState({ name: "", type: "thermal", ip: "", port: 9100, paper_width: 80, is_default: false, is_active: true });

  const { data, isLoading } = useQuery<Printer[]>({
    queryKey: ["printers"],
    queryFn: async () => {
      const res: any = await customFetch("/api/settings/printers");
      return res?.data ?? res?.printers ?? (Array.isArray(res) ? res : []);
    },
  });

  const printers: Printer[] = Array.isArray(data) ? data : [];

  const createMutation = useMutation({
    mutationFn: (payload: any) => customFetch("/api/settings/printers", { method: "POST", body: JSON.stringify(payload) }),
    onSuccess: () => {
      toast({ title: "Printer added" });
      qc.invalidateQueries({ queryKey: ["printers"] });
      setShowAdd(false);
      setNewPrinter({ name: "", type: "thermal", ip: "", port: 9100, paper_width: 80, is_default: false, is_active: true });
    },
    onError: () => toast({ title: "Failed to add printer", variant: "destructive" }),
  });

  const testMutation = useMutation({
    mutationFn: (id: string) => customFetch(`/api/settings/printers/${id}/test`, { method: "POST" }),
    onSuccess: () => toast({ title: "Test page sent" }),
    onError: () => toast({ title: "Printer test failed", variant: "destructive" }),
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setShowAdd(true)}>
          <Plus className="h-4 w-4 mr-1" /> Add Printer
        </Button>
      </div>

      {isLoading ? (
        <Skeleton className="h-32 w-full" />
      ) : printers.length === 0 ? (
        <div className="text-center text-muted-foreground py-12 border rounded-lg">
          <Printer className="h-10 w-10 mx-auto mb-2 opacity-30" />
          <p>No printers configured</p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>IP / Port</TableHead>
              <TableHead>Width</TableHead>
              <TableHead>Status</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {printers.map((p: Printer) => (
              <TableRow key={p.id}>
                <TableCell>
                  <span className="font-medium">{p.name}</span>
                  {p.is_default && <Badge variant="secondary" className="ml-2 text-xs">Default</Badge>}
                </TableCell>
                <TableCell className="capitalize">{p.type}</TableCell>
                <TableCell>{p.ip ? `${p.ip}:${p.port}` : "—"}</TableCell>
                <TableCell>{p.paper_width}mm</TableCell>
                <TableCell>
                  <Badge variant={p.is_active ? "default" : "secondary"}>{p.is_active ? "Active" : "Inactive"}</Badge>
                </TableCell>
                <TableCell>
                  <Button size="sm" variant="outline" onClick={() => testMutation.mutate(p.id)} disabled={testMutation.isPending}>
                    <TestTube className="h-4 w-4 mr-1" /> Test
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Printer</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <div><Label>Name</Label>
              <Input value={newPrinter.name} onChange={e => setNewPrinter(p => ({ ...p, name: e.target.value }))} placeholder="Receipt Printer" />
            </div>
            <div><Label>Type</Label>
              <Select value={newPrinter.type} onValueChange={v => setNewPrinter(p => ({ ...p, type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="thermal">Thermal (ESC/POS)</SelectItem>
                  <SelectItem value="laser">Laser / Network</SelectItem>
                  <SelectItem value="dot_matrix">Dot Matrix</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>IP Address</Label>
                <Input value={newPrinter.ip} onChange={e => setNewPrinter(p => ({ ...p, ip: e.target.value }))} placeholder="192.168.1.100" />
              </div>
              <div><Label>Port</Label>
                <Input type="number" value={newPrinter.port} onChange={e => setNewPrinter(p => ({ ...p, port: Number(e.target.value) }))} />
              </div>
            </div>
            <div><Label>Paper Width (mm)</Label>
              <Select value={String(newPrinter.paper_width)} onValueChange={v => setNewPrinter(p => ({ ...p, paper_width: Number(v) }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="58">58mm</SelectItem>
                  <SelectItem value="80">80mm</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={newPrinter.is_default} onCheckedChange={v => setNewPrinter(p => ({ ...p, is_default: v }))} id="def-printer" />
              <Label htmlFor="def-printer">Set as default printer</Label>
            </div>
            <Button className="w-full" onClick={() => createMutation.mutate(newPrinter)} disabled={createMutation.isPending || !newPrinter.name}>
              {createMutation.isPending ? "Adding…" : "Add Printer"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ReceiptSettings() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [form, setForm] = useState<ReceiptTemplate>({ show_logo: true, show_tax_breakdown: true, show_barcode: false, copies: 1 });

  const { data, isLoading } = useQuery<ReceiptTemplate>({
    queryKey: ["receipt-template"],
    queryFn: async () => {
      const res: any = await customFetch("/api/settings/receipt-template");
      return {
        header: res?.header_lines?.join("\n") ?? res?.header ?? "",
        footer: res?.footer_lines?.join("\n") ?? res?.footer ?? "",
        show_logo: res?.show_logo ?? true,
        show_tax_breakdown: res?.show_tax_breakdown ?? true,
        show_barcode: res?.show_barcode ?? false,
        copies: res?.copies ?? 1,
      };
    },
  });

  useEffect(() => { if (data) setForm(data as ReceiptTemplate); }, [data]);

  const saveMutation = useMutation({
    mutationFn: (payload: ReceiptTemplate) =>
      customFetch("/api/settings/receipt-template", { method: "PUT", body: JSON.stringify(payload) }),
    onSuccess: () => {
      toast({ title: "Receipt template saved" });
      qc.invalidateQueries({ queryKey: ["receipt-template"] });
    },
    onError: () => toast({ title: "Failed to save", variant: "destructive" }),
  });

  if (isLoading) return <Skeleton className="h-48 w-full" />;

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <Label>Receipt Header Text</Label>
        <textarea
          className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm"
          value={form.header ?? ""}
          onChange={e => setForm(f => ({ ...f, header: e.target.value }))}
          placeholder="e.g. Thank you for choosing RxPOS Pharmacy!"
        />
      </div>
      <div className="space-y-1">
        <Label>Receipt Footer Text</Label>
        <textarea
          className="w-full min-h-[60px] rounded-md border border-input bg-background px-3 py-2 text-sm"
          value={form.footer ?? ""}
          onChange={e => setForm(f => ({ ...f, footer: e.target.value }))}
          placeholder="e.g. Medicine helpline: 0800-12345"
        />
      </div>
      <Separator />
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Show Logo</Label>
          <Switch checked={form.show_logo} onCheckedChange={v => setForm(f => ({ ...f, show_logo: v }))} />
        </div>
        <div className="flex items-center justify-between">
          <Label>Show Tax Breakdown</Label>
          <Switch checked={form.show_tax_breakdown} onCheckedChange={v => setForm(f => ({ ...f, show_tax_breakdown: v }))} />
        </div>
        <div className="flex items-center justify-between">
          <Label>Show Barcode</Label>
          <Switch checked={form.show_barcode} onCheckedChange={v => setForm(f => ({ ...f, show_barcode: v }))} />
        </div>
        <div className="flex items-center justify-between">
          <Label>Copies per Sale</Label>
          <Select value={String(form.copies)} onValueChange={v => setForm(f => ({ ...f, copies: Number(v) }))}>
            <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="1">1</SelectItem>
              <SelectItem value="2">2</SelectItem>
              <SelectItem value="3">3</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <Button onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending}>
        <Save className="h-4 w-4 mr-2" />
        {saveMutation.isPending ? "Saving…" : "Save Receipt Template"}
      </Button>
    </div>
  );
}

function BackupSection() {
  const { toast } = useToast();

  const backupMutation = useMutation({
    mutationFn: () => customFetch("/api/settings/backup", { method: "POST" }),
    onSuccess: () => toast({ title: "Backup triggered successfully" }),
    onError: () => toast({ title: "Backup failed", variant: "destructive" }),
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Database className="h-4 w-4" /> Database Backup
          </CardTitle>
          <CardDescription>Trigger a manual database backup. Backups are also scheduled automatically.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => backupMutation.mutate()} disabled={backupMutation.isPending} variant="outline">
            {backupMutation.isPending ? "Running backup…" : "Run Backup Now"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-4 w-4" /> Security
          </CardTitle>
          <CardDescription>Session and authentication configuration.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between py-1 border-b">
            <span className="text-muted-foreground">Access Token TTL</span>
            <span className="font-medium">15 minutes</span>
          </div>
          <div className="flex justify-between py-1 border-b">
            <span className="text-muted-foreground">Refresh Token TTL</span>
            <span className="font-medium">7 days</span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-muted-foreground">Login Lockout</span>
            <span className="font-medium">5 attempts / 15 min</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function Settings() {
  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Settings"
        subtitle="Configure your pharmacy system preferences"
        icon={Settings2}
        gradient="from-slate-600 via-slate-500 to-gray-600"
      />

      <Tabs defaultValue="general">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="tax">Tax</TabsTrigger>
          <TabsTrigger value="printers">Printers</TabsTrigger>
          <TabsTrigger value="receipt">Receipt</TabsTrigger>
          <TabsTrigger value="system">System</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">General Settings</CardTitle></CardHeader>
            <CardContent><GeneralSettings /></CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tax" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Tax Configuration</CardTitle>
              <CardDescription>Configure GST / sales tax applied to all transactions.</CardDescription>
            </CardHeader>
            <CardContent><TaxSettings /></CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="printers" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Printer className="h-4 w-4" /> Printer Management
              </CardTitle>
              <CardDescription>Add and configure thermal receipt printers.</CardDescription>
            </CardHeader>
            <CardContent><PrinterSettings /></CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="receipt" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Receipt className="h-4 w-4" /> Receipt Template
              </CardTitle>
              <CardDescription>Customize what appears on printed receipts.</CardDescription>
            </CardHeader>
            <CardContent><ReceiptSettings /></CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="system" className="mt-4">
          <BackupSection />
        </TabsContent>
      </Tabs>
    </div>
  );
}
