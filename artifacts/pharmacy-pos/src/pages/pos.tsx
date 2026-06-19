import { useState, useEffect, useRef, useCallback } from "react";
import {
  useSearchMedicines,
  getSearchMedicinesQueryKey,
  useSearchPatients,
  useCreateSale,
  getListHeldSalesQueryKey,
  useListPrescriptions,
  getListPrescriptionsQueryKey,
  customFetch,
} from "@workspace/api-client-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import {
  Search, Plus, Minus, Trash2, ShoppingCart, User, FileText,
  CreditCard, X, Printer, PauseCircle, PlayCircle, RotateCcw,
  Scan, Clock, LogOut,
} from "lucide-react";
import { ShiftCloseModal } from "@/components/shift-close-modal";

const TAX_RATE = 0.17;
const HOLD_KEY = "rxpos_held_carts";

interface CartItem {
  medicine_id: string;
  medicine_name: string;
  batch_id?: string;
  quantity: number;
  unit_price: number;
  discount: number;
  requires_prescription: boolean;
  max_stock: number;
}

interface HeldCart {
  id: string;
  cart: CartItem[];
  patient: any;
  saleType: "retail" | "hospital";
  discount: number;
  savedAt: string;
}

function useDebounce<T>(value: T, delay: number): T {
  const [dv, setDv] = useState<T>(value);
  useEffect(() => {
    const t = setTimeout(() => setDv(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return dv;
}

// ── Barcode scanner hook ──────────────────────────────────────────────────────
function useBarcodeScanner(onScan: (barcode: string) => void) {
  const buffer = useRef("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      // Only intercept when focus is on body or the search input
      if (tag === "TEXTAREA" || (tag === "INPUT" && !(e.target as HTMLInputElement).dataset.barcodeCapture)) return;

      if (e.key === "Enter") {
        if (buffer.current.length >= 4) onScan(buffer.current);
        buffer.current = "";
        if (timer.current) clearTimeout(timer.current);
        return;
      }
      if (e.key.length === 1) {
        buffer.current += e.key;
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => { buffer.current = ""; }, 80);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onScan]);
}

// ── Receipt component ─────────────────────────────────────────────────────────
function Receipt({ sale, onClose }: { sale: any; onClose: () => void }) {
  const items: any[] = sale?.items ?? [];
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Receipt</DialogTitle>
        </DialogHeader>

        <div id="receipt-print" className="text-sm space-y-3">
          <div className="text-center border-b pb-3">
            <p className="font-bold text-base">RxPOS Pharmacy</p>
            <p className="text-xs text-muted-foreground">
              {new Date(sale?.created_at).toLocaleString()}
            </p>
            <p className="font-mono text-sm font-semibold mt-1">{sale?.invoice_number}</p>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs p-1">Item</TableHead>
                <TableHead className="text-xs p-1 text-right">Qty</TableHead>
                <TableHead className="text-xs p-1 text-right">Price</TableHead>
                <TableHead className="text-xs p-1 text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item: any, i: number) => (
                <TableRow key={i}>
                  <TableCell className="text-xs p-1">{item.medicine_name ?? item.medicineName}</TableCell>
                  <TableCell className="text-xs p-1 text-right">{item.quantity}</TableCell>
                  <TableCell className="text-xs p-1 text-right font-mono">{Number(item.unit_price ?? item.unitPrice).toFixed(2)}</TableCell>
                  <TableCell className="text-xs p-1 text-right font-mono">{Number(item.line_total ?? item.lineTotal).toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="border-t pt-2 space-y-1 text-xs">
            <div className="flex justify-between"><span>Subtotal</span><span className="font-mono">Rs. {Number(sale?.subtotal).toFixed(2)}</span></div>
            {Number(sale?.discount_amount) > 0 && (
              <div className="flex justify-between text-green-700"><span>Discount</span><span className="font-mono">- Rs. {Number(sale?.discount_amount).toFixed(2)}</span></div>
            )}
            <div className="flex justify-between"><span>GST (17%)</span><span className="font-mono">Rs. {Number(sale?.tax_amount).toFixed(2)}</span></div>
            <div className="flex justify-between font-bold text-sm border-t pt-1">
              <span>Total</span><span className="font-mono">Rs. {Number(sale?.total).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground capitalize"><span>{sale?.payment_method}</span>
              {sale?.change_amount > 0 && <span>Change: Rs. {Number(sale?.change_amount).toFixed(2)}</span>}
            </div>
          </div>

          <p className="text-center text-xs text-muted-foreground border-t pt-2">Thank you for your visit!</p>
        </div>

        <div className="flex gap-2 pt-2">
          <Button className="flex-1" onClick={() => window.print()}>
            <Printer className="h-4 w-4 mr-2" /> Print
          </Button>
          <Button variant="outline" className="flex-1" onClick={onClose}>Close</Button>
        </div>

        <style>{`
          @media print {
            body * { visibility: hidden !important; }
            #receipt-print, #receipt-print * { visibility: visible !important; }
            #receipt-print { position: fixed !important; top: 0; left: 0; width: 100%; background: white; padding: 16px; }
          }
        `}</style>
      </DialogContent>
    </Dialog>
  );
}

// ── Refund dialog ─────────────────────────────────────────────────────────────
function RefundDialog({ onClose }: { onClose: () => void }) {
  const { toast } = useToast();
  const [invoiceSearch, setInvoiceSearch] = useState("");
  const [foundSale, setFoundSale] = useState<any>(null);
  const [refundQtys, setRefundQtys] = useState<Record<string, number>>({});
  const [searching, setSearching] = useState(false);

  const searchSale = async () => {
    if (!invoiceSearch.trim()) return;
    setSearching(true);
    try {
      const res: any = await customFetch(`/api/sales/search?invoice_number=${encodeURIComponent(invoiceSearch.trim())}`);
      const sales = res?.data ?? res?.sales ?? (Array.isArray(res) ? res : []);
      if (sales.length === 0) { toast({ title: "No sale found", variant: "destructive" }); return; }
      setFoundSale(sales[0]);
      const qtys: Record<string, number> = {};
      (sales[0].items ?? []).forEach((i: any) => { qtys[i.id] = 0; });
      setRefundQtys(qtys);
    } catch {
      toast({ title: "Search failed", variant: "destructive" });
    } finally {
      setSearching(false);
    }
  };

  const refundMutation = useMutation({
    mutationFn: async () => {
      const items = Object.entries(refundQtys)
        .filter(([, qty]) => qty > 0)
        .map(([sale_item_id, quantity]) => ({ sale_item_id, quantity }));
      if (items.length === 0) throw new Error("Select at least one item to refund");
      return customFetch(`/api/sales/${foundSale.id}/refund`, {
        method: "POST",
        body: JSON.stringify({ items, restock: true, refund_method: "cash" }),
      });
    },
    onSuccess: () => {
      toast({ title: "Refund processed successfully" });
      onClose();
    },
    onError: (err: any) => {
      const msg = err?.detail?.error?.message ?? err?.message ?? "Refund failed";
      toast({ title: msg, variant: "destructive" });
    },
  });

  const items: any[] = foundSale?.items ?? [];
  const refundTotal = items.reduce((s: number, i: any) => {
    const qty = refundQtys[i.id] ?? 0;
    return s + qty * Number(i.unit_price ?? i.unitPrice ?? 0);
  }, 0);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Process Refund</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Invoice number (e.g. INV-2026-0001)"
              value={invoiceSearch}
              onChange={e => setInvoiceSearch(e.target.value)}
              onKeyDown={e => e.key === "Enter" && searchSale()}
            />
            <Button onClick={searchSale} disabled={searching} variant="secondary">
              {searching ? "…" : <Search className="h-4 w-4" />}
            </Button>
          </div>

          {foundSale && (
            <div className="space-y-3">
              <div className="text-xs text-muted-foreground flex justify-between">
                <span>{foundSale.invoice_number} · {new Date(foundSale.created_at).toLocaleDateString()}</span>
                <span className="capitalize">{foundSale.payment_method}</span>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Item</TableHead>
                    <TableHead className="text-xs text-right">Sold</TableHead>
                    <TableHead className="text-xs text-right">Price</TableHead>
                    <TableHead className="text-xs text-right w-20">Refund Qty</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item: any) => (
                    <TableRow key={item.id}>
                      <TableCell className="text-xs py-1">{item.medicine_name ?? item.medicineName}</TableCell>
                      <TableCell className="text-xs py-1 text-right">{item.quantity}</TableCell>
                      <TableCell className="text-xs py-1 text-right font-mono">{Number(item.unit_price ?? item.unitPrice).toFixed(2)}</TableCell>
                      <TableCell className="py-1">
                        <Input
                          type="number"
                          min={0}
                          max={item.quantity}
                          value={refundQtys[item.id] ?? 0}
                          onChange={e => setRefundQtys(q => ({ ...q, [item.id]: Math.min(item.quantity, Math.max(0, Number(e.target.value))) }))}
                          className="h-7 text-right text-xs w-full"
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {refundTotal > 0 && (
                <div className="flex justify-between font-semibold text-sm border-t pt-2">
                  <span>Refund Amount</span>
                  <span className="font-mono text-red-600">Rs. {refundTotal.toFixed(2)}</span>
                </div>
              )}

              <Button
                className="w-full"
                variant="destructive"
                onClick={() => refundMutation.mutate()}
                disabled={refundMutation.isPending || refundTotal === 0}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                {refundMutation.isPending ? "Processing…" : "Process Refund"}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Main POS ──────────────────────────────────────────────────────────────────
export default function POS() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [cart, setCart] = useState<CartItem[]>([]);
  const [medSearch, setMedSearch] = useState("");
  const [patientSearch, setPatientSearch] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [selectedPrescription, setSelectedPrescription] = useState<any>(null);
  const [rxOverride, setRxOverride] = useState(false);
  const [saleType, setSaleType] = useState<"retail" | "hospital">("retail");
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card" | "credit">("cash");
  const [amountTendered, setAmountTendered] = useState("");
  const [globalDiscount, setGlobalDiscount] = useState(0);
  const [showMedResults, setShowMedResults] = useState(false);
  const [showPatientResults, setShowPatientResults] = useState(false);
  const [receiptSale, setReceiptSale] = useState<any>(null);
  const [showRefund, setShowRefund] = useState(false);
  const [showHeld, setShowHeld] = useState(false);
  const [showShiftClose, setShowShiftClose] = useState(false);
  const [heldCarts, setHeldCarts] = useState<HeldCart[]>([]);

  // Load held carts from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(HOLD_KEY);
      if (saved) setHeldCarts(JSON.parse(saved));
    } catch {}
  }, []);

  const saveHeldCarts = (carts: HeldCart[]) => {
    setHeldCarts(carts);
    localStorage.setItem(HOLD_KEY, JSON.stringify(carts));
  };

  const holdCart = () => {
    if (cart.length === 0) return;
    const held: HeldCart = {
      id: crypto.randomUUID(),
      cart,
      patient: selectedPatient,
      saleType,
      discount: globalDiscount,
      savedAt: new Date().toISOString(),
    };
    saveHeldCarts([...heldCarts, held]);
    setCart([]);
    setSelectedPatient(null);
    setGlobalDiscount(0);
    toast({ title: "Sale held — cart saved" });
  };

  const resumeCart = (held: HeldCart) => {
    if (cart.length > 0 && !confirm("Replace current cart with held sale?")) return;
    setCart(held.cart);
    setSelectedPatient(held.patient);
    setSaleType(held.saleType);
    setGlobalDiscount(held.discount);
    saveHeldCarts(heldCarts.filter(h => h.id !== held.id));
    setShowHeld(false);
    toast({ title: "Sale resumed" });
  };

  const deleteHeld = (id: string) => {
    saveHeldCarts(heldCarts.filter(h => h.id !== id));
  };

  const debouncedMedSearch = useDebounce(medSearch, 300);
  const debouncedPatientSearch = useDebounce(patientSearch, 300);

  const { data: medResults } = useSearchMedicines(
    { q: debouncedMedSearch, branch_id: user?.branch_id ?? undefined },
    { query: { enabled: debouncedMedSearch.length >= 2, queryKey: getSearchMedicinesQueryKey({ q: debouncedMedSearch }) } }
  );

  const { data: patientResults } = useSearchPatients(
    { q: debouncedPatientSearch },
    { query: { enabled: debouncedPatientSearch.length >= 2, queryKey: ["searchPatients", debouncedPatientSearch] } }
  );

  const { data: patientPrescriptions } = useListPrescriptions(
    { patient_id: selectedPatient?.id },
    { query: { enabled: !!selectedPatient?.id && cart.some(i => i.requires_prescription), queryKey: getListPrescriptionsQueryKey({ patient_id: selectedPatient?.id }) } }
  );

  const createSale = useCreateSale();

  const addToCart = useCallback((med: any) => {
    const maxStock = Number(med.current_stock ?? 9999);
    if (maxStock === 0) { toast({ title: `${med.name} is out of stock`, variant: "destructive" }); return; }
    setCart(prev => {
      const existing = prev.find(i => i.medicine_id === med.id);
      if (existing) {
        if (existing.quantity >= maxStock) {
          toast({ title: `Only ${maxStock} units available for ${med.name}`, variant: "destructive" });
          return prev;
        }
        return prev.map(i => i.medicine_id === med.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, {
        medicine_id: med.id,
        medicine_name: med.name,
        quantity: 1,
        unit_price: Number(med.selling_price ?? med.mrp),
        discount: 0,
        requires_prescription: med.requires_prescription ?? false,
        max_stock: maxStock,
      }];
    });
    setMedSearch("");
    setShowMedResults(false);
  }, [toast]);

  // Barcode scanner — looks up barcode and adds medicine
  useBarcodeScanner(useCallback(async (barcode: string) => {
    try {
      const res: any = await customFetch("/api/medicines/barcode-lookup", {
        method: "POST",
        body: JSON.stringify({ raw_scan: barcode }),
      });
      const med = res?.medicine ?? res;
      if (med?.id) {
        // Fetch current stock
        const search: any = await customFetch(`/api/medicines/search?q=${encodeURIComponent(med.name)}`);
        const withStock = (Array.isArray(search) ? search : []).find((m: any) => m.id === med.id);
        addToCart(withStock ?? med);
        toast({ title: `${med.name} added via barcode` });
      }
    } catch {
      toast({ title: `No medicine found for barcode: ${barcode}`, variant: "destructive" });
    }
  }, [addToCart, toast]));

  const updateQty = (medicineId: string, delta: number) => {
    setCart(prev => prev.map(i => {
      if (i.medicine_id !== medicineId) return i;
      const newQty = i.quantity + delta;
      if (newQty > i.max_stock) {
        toast({ title: `Only ${i.max_stock} units available for ${i.medicine_name}`, variant: "destructive" });
        return i;
      }
      return { ...i, quantity: Math.max(1, newQty) };
    }));
  };

  const removeItem = (medicineId: string) => setCart(prev => prev.filter(i => i.medicine_id !== medicineId));

  const subtotal = cart.reduce((s, i) => s + i.quantity * i.unit_price - i.discount, 0);
  const taxableAmount = Math.max(0, subtotal - globalDiscount);
  const taxAmount = taxableAmount * TAX_RATE;
  const total = taxableAmount + taxAmount;
  const change = paymentMethod === "cash" && amountTendered ? Math.max(0, Number(amountTendered) - total) : 0;
  const needsRx = cart.some(i => i.requires_prescription);
  const rxSatisfied = !needsRx || !!selectedPrescription || rxOverride;

  const handleCompleteSale = () => {
    if (cart.length === 0) { toast({ title: "Cart is empty", variant: "destructive" }); return; }
    if (!rxSatisfied) { toast({ title: "Prescription required for some items", variant: "destructive" }); return; }

    createSale.mutate({
      data: {
        branch_id: user?.branch_id ?? "",
        patient_id: selectedPatient?.id ?? undefined,
        prescription_id: selectedPrescription?.id ?? undefined,
        force: rxOverride ? true : undefined,
        sale_type: saleType,
        items: cart.map(i => ({
          medicine_id: i.medicine_id,
          medicine_name: i.medicine_name,
          quantity: i.quantity,
          unit_price: i.unit_price,
          discount: i.discount,
          batch_id: i.batch_id,
        })) as any,
        discount: globalDiscount,
        tax_rate: TAX_RATE,
        payment_method: paymentMethod,
        amount_tendered: paymentMethod === "cash" ? Number(amountTendered) || total : total,
        notes: null,
      } as any,
    }, {
      onSuccess: (data: any) => {
        const saleObj = data?.sale ?? data;
        setReceiptSale(saleObj);
        setCart([]);
        setSelectedPatient(null);
        setSelectedPrescription(null);
        setRxOverride(false);
        setGlobalDiscount(0);
        setAmountTendered("");
        setPaymentOpen(false);
        queryClient.invalidateQueries({ queryKey: getListHeldSalesQueryKey() });
        queryClient.invalidateQueries({ queryKey: ["/api/medicines/search"] });
        queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
        queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      },
      onError: (err: any) => {
        const msg = err?.detail?.error?.message ?? err?.message ?? "Sale failed";
        toast({ title: msg, variant: "destructive" });
      },
    });
  };

  const medicines = Array.isArray(medResults) ? medResults : [];
  const patients = Array.isArray(patientResults) ? patientResults : [];

  return (
    <div className="flex flex-col xl:flex-row h-full gap-4">
      <ShiftCloseModal open={showShiftClose} onClose={() => setShowShiftClose(false)} />
      {/* ── Left panel ── */}
      <div className="flex-1 space-y-4 min-w-0">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Point of Sale</h1>
          <div className="flex gap-1.5 flex-wrap">
            <Button variant="outline" size="sm" onClick={() => setShowRefund(true)}>
              <RotateCcw className="h-4 w-4 mr-1" /> <span className="hidden sm:inline">Refund</span>
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowHeld(true)} className="relative">
              <Clock className="h-4 w-4 mr-1" /> <span className="hidden sm:inline">Held</span>
              {heldCarts.length > 0 && (
                <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center">
                  {heldCarts.length}
                </span>
              )}
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowShiftClose(true)} className="border-orange-300 text-orange-600 hover:bg-orange-50">
              <LogOut className="h-4 w-4 mr-1" /> <span className="hidden sm:inline">Close Shift</span>
            </Button>
          </div>
        </div>

        {/* Medicine search */}
        <Card>
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search medicine or scan barcode…"
                className="pl-9"
                value={medSearch}
                data-barcode-capture="true"
                onChange={e => { setMedSearch(e.target.value); setShowMedResults(true); }}
                onFocus={() => setShowMedResults(true)}
              />
              <Scan className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground opacity-40" />
              {showMedResults && medicines.length > 0 && (
                <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-popover border rounded-md shadow-lg max-h-64 overflow-y-auto">
                  {medicines.map((med: any) => (
                    <button
                      key={med.id}
                      className="w-full text-left px-4 py-2.5 hover:bg-accent transition-colors flex items-center justify-between"
                      onClick={() => addToCart(med)}
                    >
                      <div>
                        <p className="font-medium text-sm">{med.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {med.strength} · Stock:
                          <span className={med.current_stock <= 10 ? " text-red-500 font-semibold" : " text-green-600 font-semibold"}>
                            {" "}{med.current_stock ?? "—"}
                          </span>
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-mono font-medium">Rs. {Number(med.selling_price ?? med.mrp).toFixed(2)}</p>
                        {med.requires_prescription && <Badge variant="destructive" className="text-xs">Rx</Badge>}
                        {med.current_stock <= 10 && med.current_stock > 0 && <Badge variant="outline" className="text-xs ml-1 text-orange-600 border-orange-300">Low</Badge>}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Patient & Mode */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex gap-2">
              <Select value={saleType} onValueChange={(v: "retail" | "hospital") => setSaleType(v)}>
                <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="retail">Retail</SelectItem>
                  <SelectItem value="hospital">Hospital</SelectItem>
                </SelectContent>
              </Select>
              <div className="relative flex-1">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                {selectedPatient ? (
                  <div className="flex items-center gap-2 border rounded-md px-3 py-2 bg-primary/5">
                    <span className="text-sm font-medium flex-1">{selectedPatient.name}</span>
                    {selectedPatient.allergies?.length > 0 && <Badge variant="destructive" className="text-xs">Allergy Alert</Badge>}
                    <button onClick={() => setSelectedPatient(null)}><X className="h-4 w-4 text-muted-foreground" /></button>
                  </div>
                ) : (
                  <Input
                    placeholder="Search patient…"
                    className="pl-9"
                    value={patientSearch}
                    onChange={e => { setPatientSearch(e.target.value); setShowPatientResults(true); }}
                    onFocus={() => setShowPatientResults(true)}
                  />
                )}
                {showPatientResults && !selectedPatient && patients.length > 0 && (
                  <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-popover border rounded-md shadow-lg max-h-48 overflow-y-auto">
                    {patients.map((p: any) => (
                      <button key={p.id} className="w-full text-left px-4 py-2 hover:bg-accent transition-colors"
                        onClick={() => { setSelectedPatient(p); setPatientSearch(""); setShowPatientResults(false); }}>
                        <p className="font-medium text-sm">{p.name}</p>
                        <p className="text-xs text-muted-foreground">{p.phone}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {needsRx && (() => {
              const rxList: any[] = Array.isArray((patientPrescriptions as any)?.data) ? (patientPrescriptions as any).data : [];
              return (
                <div className="space-y-2">
                  {/* Prescription selector */}
                  <div className="relative">
                    <FileText className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
                    {selectedPrescription ? (
                      <div className="flex items-center gap-2 border rounded-md px-3 py-2 bg-emerald-50 border-emerald-200 pl-9">
                        <span className="text-sm font-medium flex-1 text-emerald-700">
                          ✓ Rx #{selectedPrescription.prescriptionNumber ?? selectedPrescription.prescription_number ?? selectedPrescription.id.slice(0, 8)}
                        </span>
                        <button onClick={() => setSelectedPrescription(null)}><X className="h-4 w-4 text-muted-foreground" /></button>
                      </div>
                    ) : !selectedPatient ? (
                      <div className="pl-9 py-2 text-xs text-muted-foreground bg-muted/40 border rounded-md">
                        Select a patient above to link their prescription
                      </div>
                    ) : rxList.length === 0 ? (
                      <div className="pl-9 py-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md">
                        No prescriptions found for this patient
                      </div>
                    ) : (
                      <Select onValueChange={id => {
                        const rx = rxList.find((r: any) => r.id === id);
                        if (rx) { setSelectedPrescription(rx); setRxOverride(false); }
                      }}>
                        <SelectTrigger className="pl-9"><SelectValue placeholder="Link prescription…" /></SelectTrigger>
                        <SelectContent>
                          {rxList.map((rx: any) => (
                            <SelectItem key={rx.id} value={rx.id}>
                              Rx #{rx.prescriptionNumber ?? rx.prescription_number ?? rx.id.slice(0, 8)} — {rx.prescriberName ?? rx.prescriber_name ?? "Unknown"}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>

                  {/* Override option — shown when no prescription linked */}
                  {!selectedPrescription && (
                    <label className="flex items-center gap-2 cursor-pointer select-none rounded-md border border-dashed px-3 py-2 hover:bg-muted/40 transition-colors">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded accent-orange-500"
                        checked={rxOverride}
                        onChange={e => setRxOverride(e.target.checked)}
                      />
                      <span className="text-xs text-muted-foreground">
                        <span className="font-medium text-orange-600">Proceed without Rx</span>
                        {" "}— walk-in / verbal prescription
                      </span>
                    </label>
                  )}
                </div>
              );
            })()}
          </CardContent>
        </Card>

        {/* Cart */}
        <Card className="flex-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Cart ({cart.length} item{cart.length !== 1 ? "s" : ""})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <ShoppingCart className="h-10 w-10 mb-3 opacity-30" />
                <p className="text-sm">Cart is empty</p>
                <p className="text-xs mt-1 opacity-60">Search medicine above or scan a barcode</p>
              </div>
            ) : (
              <div className="divide-y">
                {cart.map(item => (
                  <div key={item.medicine_id} className="flex items-center gap-3 p-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.medicine_name}</p>
                      <p className="text-xs text-muted-foreground">Rs. {item.unit_price.toFixed(2)} each · Stock: {item.max_stock}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button size="sm" variant="outline" className="h-7 w-7 p-0" onClick={() => updateQty(item.medicine_id, -1)}><Minus className="h-3 w-3" /></Button>
                      <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                      <Button size="sm" variant="outline" className="h-7 w-7 p-0" onClick={() => updateQty(item.medicine_id, 1)}><Plus className="h-3 w-3" /></Button>
                    </div>
                    <span className="text-sm font-mono font-medium w-20 text-right">
                      Rs. {(item.quantity * item.unit_price - item.discount).toFixed(2)}
                    </span>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => removeItem(item.medicine_id)}>
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Right checkout panel ── */}
      <div className="w-full xl:w-72 flex flex-col gap-4 xl:shrink-0">
        {needsRx && selectedPrescription && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-md p-3">
            <p className="text-xs font-semibold text-emerald-700">✓ Prescription Linked</p>
            <p className="text-xs text-emerald-600">Rx #{selectedPrescription.prescriptionNumber ?? selectedPrescription.prescription_number ?? selectedPrescription.id.slice(0, 8)}</p>
          </div>
        )}
        {needsRx && !selectedPrescription && rxOverride && (
          <div className="bg-orange-50 border border-orange-200 rounded-md p-3">
            <p className="text-xs font-semibold text-orange-700">⚠ Override Active</p>
            <p className="text-xs text-orange-600">Proceeding without a linked prescription.</p>
          </div>
        )}
        {needsRx && !selectedPrescription && !rxOverride && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 space-y-1">
            <p className="text-xs font-semibold text-yellow-700">⚠ Prescription Required</p>
            <p className="text-xs text-yellow-600">
              Link a prescription in the patient section, or check "Proceed without Rx" for walk-in customers.
            </p>
          </div>
        )}

        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-mono">Rs. {subtotal.toFixed(2)}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground flex-1">Discount</span>
              <Input type="number" className="w-24 h-7 text-sm text-right" value={globalDiscount}
                onChange={e => setGlobalDiscount(Number(e.target.value) || 0)} min={0} />
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">GST (17%)</span>
              <span className="font-mono">Rs. {taxAmount.toFixed(2)}</span>
            </div>
            <Separator />
            <div className="flex justify-between font-bold text-lg">
              <span>Total</span>
              <span className="font-mono">Rs. {total.toFixed(2)}</span>
            </div>
          </CardContent>
        </Card>

        <Button size="lg" className="w-full" disabled={cart.length === 0 || !rxSatisfied} onClick={() => setPaymentOpen(true)}>
          <CreditCard className="h-4 w-4 mr-2" /> Proceed to Payment
        </Button>

        <Button size="sm" variant="outline" className="w-full" disabled={cart.length === 0} onClick={holdCart}>
          <PauseCircle className="h-4 w-4 mr-2" /> Hold Sale
        </Button>
      </div>

      {/* ── Payment modal ── */}
      <Dialog open={paymentOpen} onOpenChange={setPaymentOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Complete Payment</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="text-center py-2">
              <p className="text-muted-foreground text-sm">Amount Due</p>
              <p className="text-4xl font-bold font-mono">Rs. {total.toFixed(2)}</p>
            </div>
            <div>
              <Label className="text-sm mb-2 block">Payment Method</Label>
              <div className="grid grid-cols-3 gap-2">
                {(["cash", "card", "credit"] as const).map(method => (
                  <button key={method}
                    className={`p-2 rounded-md border text-sm font-medium capitalize transition-colors ${paymentMethod === method ? "bg-primary text-primary-foreground border-primary" : "hover:bg-accent"}`}
                    onClick={() => setPaymentMethod(method)}>
                    {method}
                  </button>
                ))}
              </div>
            </div>
            {paymentMethod === "cash" && (
              <div>
                <Label className="text-sm mb-1 block">Amount Tendered</Label>
                <Input type="number" value={amountTendered} onChange={e => setAmountTendered(e.target.value)}
                  placeholder={total.toFixed(2)} className="text-right font-mono" />
                {change > 0 && <p className="text-sm text-green-600 font-medium mt-1 text-right">Change: Rs. {change.toFixed(2)}</p>}
              </div>
            )}
            <Button className="w-full" onClick={handleCompleteSale} disabled={createSale.isPending}>
              {createSale.isPending ? "Processing…" : "Complete Sale"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Held carts modal ── */}
      <Dialog open={showHeld} onOpenChange={setShowHeld}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Held Sales</DialogTitle></DialogHeader>
          {heldCarts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No held sales</p>
            </div>
          ) : (
            <div className="space-y-2">
              {heldCarts.map(held => (
                <div key={held.id} className="flex items-center gap-3 border rounded-md p-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{held.cart.length} item{held.cart.length !== 1 ? "s" : ""}
                      {held.patient && <span className="text-muted-foreground"> · {held.patient.name}</span>}
                    </p>
                    <p className="text-xs text-muted-foreground">{new Date(held.savedAt).toLocaleTimeString()}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {held.cart.map(i => i.medicine_name).join(", ")}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="outline" className="h-8 w-8 p-0" onClick={() => resumeCart(held)}>
                      <PlayCircle className="h-4 w-4 text-green-600" />
                    </Button>
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => deleteHeld(held.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Receipt ── */}
      {receiptSale && <Receipt sale={receiptSale} onClose={() => setReceiptSale(null)} />}

      {/* ── Refund ── */}
      {showRefund && <RefundDialog onClose={() => setShowRefund(false)} />}
    </div>
  );
}
