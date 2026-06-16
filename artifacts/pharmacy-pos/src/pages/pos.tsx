import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  useSearchMedicines,
  getSearchMedicinesQueryKey,
  useSearchPatients,
  useCreateSale,
  useCalculateSale,
  useListHeldSales,
  getListHeldSalesQueryKey,
  useListPrescriptions,
  getListPrescriptionsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Search, Plus, Minus, Trash2, ShoppingCart, User, FileText, CreditCard, Banknote, X } from "lucide-react";

interface CartItem {
  medicine_id: string;
  medicine_name: string;
  batch_id?: string;
  quantity: number;
  unit_price: number;
  discount: number;
  requires_prescription: boolean;
}

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
}

export default function POS() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [cart, setCart] = useState<CartItem[]>([]);
  const [medSearch, setMedSearch] = useState("");
  const [patientSearch, setPatientSearch] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [selectedPrescription, setSelectedPrescription] = useState<any>(null);
  const [saleType, setSaleType] = useState<"retail" | "hospital">("retail");
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card" | "credit">("cash");
  const [amountTendered, setAmountTendered] = useState("");
  const [globalDiscount, setGlobalDiscount] = useState(0);
  const [showMedResults, setShowMedResults] = useState(false);
  const [showPatientResults, setShowPatientResults] = useState(false);
  const [lastInvoice, setLastInvoice] = useState<string | null>(null);

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
    { query: { enabled: !!selectedPatient?.id && cart.some((i) => i.requires_prescription), queryKey: getListPrescriptionsQueryKey({ patient_id: selectedPatient?.id }) } }
  );

  const { data: heldSales } = useListHeldSales(
    { branch_id: user?.branch_id ?? undefined },
    { query: { queryKey: getListHeldSalesQueryKey({ branch_id: user?.branch_id ?? undefined }) } }
  );

  const createSale = useCreateSale();

  const addToCart = (med: any) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.medicine_id === med.id);
      if (existing) {
        return prev.map((i) => i.medicine_id === med.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, {
        medicine_id: med.id,
        medicine_name: med.name,
        quantity: 1,
        unit_price: Number(med.selling_price ?? med.mrp),
        discount: 0,
        requires_prescription: med.requires_prescription ?? false,
      }];
    });
    setMedSearch("");
    setShowMedResults(false);
  };

  const updateQty = (medicineId: string, delta: number) => {
    setCart((prev) => prev.map((i) => i.medicine_id === medicineId
      ? { ...i, quantity: Math.max(1, i.quantity + delta) }
      : i
    ));
  };

  const removeItem = (medicineId: string) => {
    setCart((prev) => prev.filter((i) => i.medicine_id !== medicineId));
  };

  const subtotal = cart.reduce((s, i) => s + i.quantity * i.unit_price - i.discount, 0);
  const discountAmt = globalDiscount;
  const total = Math.max(0, subtotal - discountAmt);
  const change = paymentMethod === "cash" && amountTendered ? Math.max(0, Number(amountTendered) - total) : 0;

  const needsRx = cart.some((i) => i.requires_prescription);

  const handleCompleteSale = () => {
    if (cart.length === 0) { toast({ title: "Cart is empty", variant: "destructive" }); return; }
    if (needsRx && !selectedPrescription) {
      toast({ title: "Prescription required for some items", variant: "destructive" });
      return;
    }

    createSale.mutate({
      data: {
        branch_id: user?.branch_id ?? "",
        patient_id: selectedPatient?.id ?? undefined,
        prescription_id: selectedPrescription?.id ?? undefined,
        sale_type: saleType,
        items: cart.map((i) => ({
          medicine_id: i.medicine_id,
          medicine_name: i.medicine_name,
          quantity: i.quantity,
          unit_price: i.unit_price,
          discount: i.discount,
          batch_id: i.batch_id,
        })) as any,
        discount: discountAmt,
        payment_method: paymentMethod,
        amount_tendered: paymentMethod === "cash" ? Number(amountTendered) || total : total,
        notes: null,
      } as any,
    }, {
      onSuccess: (data: any) => {
        const saleObj = data?.sale ?? data;
        const invoiceNum = saleObj?.invoiceNumber ?? saleObj?.invoice_number ?? "—";
        setLastInvoice(invoiceNum);
        toast({ title: `Sale complete — ${invoiceNum}` });
        setCart([]);
        setSelectedPatient(null);
        setSelectedPrescription(null);
        setGlobalDiscount(0);
        setAmountTendered("");
        setPaymentOpen(false);
        queryClient.invalidateQueries({ queryKey: getListHeldSalesQueryKey() });
      },
      onError: () => toast({ title: "Sale failed", variant: "destructive" }),
    });
  };

  const medicines = Array.isArray(medResults) ? medResults : [];
  const patients = Array.isArray(patientResults) ? patientResults : [];

  return (
    <div className="flex h-full gap-4">
      {/* Left: Product selection */}
      <div className="flex-1 space-y-4 min-w-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Point of Sale</h1>
        </div>

        {/* Medicine search */}
        <Card>
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search medicine by name or barcode..."
                className="pl-9"
                value={medSearch}
                onChange={(e) => { setMedSearch(e.target.value); setShowMedResults(true); }}
                onFocus={() => setShowMedResults(true)}
                data-testid="input-medicine-search-pos"
              />
              {showMedResults && medicines.length > 0 && (
                <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-popover border rounded-md shadow-lg max-h-64 overflow-y-auto">
                  {medicines.map((med: any) => (
                    <button
                      key={med.id}
                      className="w-full text-left px-4 py-2.5 hover:bg-accent transition-colors flex items-center justify-between"
                      onClick={() => addToCart(med)}
                      data-testid={`button-add-to-cart-${med.id}`}
                    >
                      <div>
                        <p className="font-medium text-sm">{med.name}</p>
                        <p className="text-xs text-muted-foreground">{med.strength} · Stock: {med.current_stock}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-mono font-medium">Rs. {Number(med.selling_price ?? med.mrp).toFixed(2)}</p>
                        {med.requires_prescription && <Badge variant="destructive" className="text-xs">Rx</Badge>}
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
                <SelectTrigger className="w-[140px]" data-testid="select-sale-type">
                  <SelectValue />
                </SelectTrigger>
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
                    {selectedPatient.allergies?.length > 0 && (
                      <Badge variant="destructive" className="text-xs">Allergy Alert</Badge>
                    )}
                    <button onClick={() => setSelectedPatient(null)}><X className="h-4 w-4 text-muted-foreground" /></button>
                  </div>
                ) : (
                  <Input
                    placeholder="Search patient..."
                    className="pl-9"
                    value={patientSearch}
                    onChange={(e) => { setPatientSearch(e.target.value); setShowPatientResults(true); }}
                    onFocus={() => setShowPatientResults(true)}
                    data-testid="input-patient-search-pos"
                  />
                )}
                {showPatientResults && !selectedPatient && patients.length > 0 && (
                  <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-popover border rounded-md shadow-lg max-h-48 overflow-y-auto">
                    {patients.map((p: any) => (
                      <button
                        key={p.id}
                        className="w-full text-left px-4 py-2 hover:bg-accent transition-colors"
                        onClick={() => { setSelectedPatient(p); setPatientSearch(""); setShowPatientResults(false); }}
                      >
                        <p className="font-medium text-sm">{p.name}</p>
                        <p className="text-xs text-muted-foreground">{p.phone}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Prescription selector — shown when Rx items are in cart */}
            {needsRx && (
              <div className="relative">
                <FileText className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                {selectedPrescription ? (
                  <div className="flex items-center gap-2 border rounded-md px-3 py-2 bg-primary/5 pl-9">
                    <span className="text-sm font-medium flex-1">Rx #{selectedPrescription.prescriptionNumber ?? selectedPrescription.prescription_number ?? selectedPrescription.id.slice(0, 8)}</span>
                    <button onClick={() => setSelectedPrescription(null)}><X className="h-4 w-4 text-muted-foreground" /></button>
                  </div>
                ) : !selectedPatient ? (
                  <div className="pl-9 py-2 text-xs text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-md">
                    Select a patient to link their prescription
                  </div>
                ) : (
                  <Select onValueChange={(id) => {
                    const rx = (Array.isArray((patientPrescriptions as any)?.data) ? (patientPrescriptions as any).data : []).find((r: any) => r.id === id);
                    if (rx) setSelectedPrescription(rx);
                  }}>
                    <SelectTrigger className="pl-9" data-testid="select-prescription">
                      <SelectValue placeholder="Link prescription..." />
                    </SelectTrigger>
                    <SelectContent>
                      {(Array.isArray((patientPrescriptions as any)?.data) ? (patientPrescriptions as any).data : []).map((rx: any) => (
                        <SelectItem key={rx.id} value={rx.id}>
                          Rx #{rx.prescriptionNumber ?? rx.prescription_number ?? rx.id.slice(0, 8)} — {rx.prescriberName ?? rx.prescriber_name ?? "Unknown"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            )}
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
              </div>
            ) : (
              <div className="divide-y">
                {cart.map((item) => (
                  <div key={item.medicine_id} className="flex items-center gap-3 p-3" data-testid={`cart-item-${item.medicine_id}`}>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.medicine_name}</p>
                      <p className="text-xs text-muted-foreground">Rs. {item.unit_price.toFixed(2)} each</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button size="sm" variant="outline" className="h-7 w-7 p-0" onClick={() => updateQty(item.medicine_id, -1)} data-testid={`button-qty-minus-${item.medicine_id}`}>
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-8 text-center text-sm font-medium" data-testid={`text-qty-${item.medicine_id}`}>{item.quantity}</span>
                      <Button size="sm" variant="outline" className="h-7 w-7 p-0" onClick={() => updateQty(item.medicine_id, 1)} data-testid={`button-qty-plus-${item.medicine_id}`}>
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                    <span className="text-sm font-mono font-medium w-20 text-right" data-testid={`text-line-total-${item.medicine_id}`}>
                      Rs. {(item.quantity * item.unit_price - item.discount).toFixed(2)}
                    </span>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => removeItem(item.medicine_id)} data-testid={`button-remove-${item.medicine_id}`}>
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Right: Checkout panel */}
      <div className="w-72 flex flex-col gap-4 shrink-0">
        {needsRx && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
            <p className="text-xs font-semibold text-yellow-700">Prescription Required</p>
            <p className="text-xs text-yellow-600 mt-0.5">One or more items require a valid prescription.</p>
          </div>
        )}

        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-mono" data-testid="text-subtotal">Rs. {subtotal.toFixed(2)}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground flex-1">Discount</span>
              <Input
                type="number"
                className="w-24 h-7 text-sm text-right"
                value={globalDiscount}
                onChange={(e) => setGlobalDiscount(Number(e.target.value) || 0)}
                min={0}
                data-testid="input-discount"
              />
            </div>
            <Separator />
            <div className="flex justify-between font-bold text-lg">
              <span>Total</span>
              <span className="font-mono" data-testid="text-total">Rs. {total.toFixed(2)}</span>
            </div>
          </CardContent>
        </Card>

        <Button
          size="lg"
          className="w-full"
          disabled={cart.length === 0}
          onClick={() => setPaymentOpen(true)}
          data-testid="button-open-payment"
        >
          <CreditCard className="h-4 w-4 mr-2" /> Proceed to Payment
        </Button>

        {lastInvoice && (
          <div className="text-center p-3 bg-green-50 border border-green-200 rounded-md">
            <p className="text-xs text-green-700 font-medium">Last Sale</p>
            <p className="text-sm font-mono font-bold text-green-800">{lastInvoice}</p>
          </div>
        )}
      </div>

      {/* Payment Modal */}
      <Dialog open={paymentOpen} onOpenChange={setPaymentOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Complete Payment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-center py-2">
              <p className="text-muted-foreground text-sm">Amount Due</p>
              <p className="text-4xl font-bold font-mono" data-testid="text-amount-due">Rs. {total.toFixed(2)}</p>
            </div>

            <div>
              <Label className="text-sm mb-2 block">Payment Method</Label>
              <div className="grid grid-cols-3 gap-2">
                {(["cash", "card", "credit"] as const).map((method) => (
                  <button
                    key={method}
                    className={`p-2 rounded-md border text-sm font-medium capitalize transition-colors ${paymentMethod === method ? "bg-primary text-primary-foreground border-primary" : "hover:bg-accent"}`}
                    onClick={() => setPaymentMethod(method)}
                    data-testid={`button-payment-${method}`}
                  >
                    {method}
                  </button>
                ))}
              </div>
            </div>

            {paymentMethod === "cash" && (
              <div>
                <Label className="text-sm mb-1 block">Amount Tendered</Label>
                <Input
                  type="number"
                  value={amountTendered}
                  onChange={(e) => setAmountTendered(e.target.value)}
                  placeholder={total.toFixed(2)}
                  className="text-right font-mono"
                  data-testid="input-amount-tendered"
                />
                {change > 0 && (
                  <p className="text-sm text-green-600 font-medium mt-1 text-right" data-testid="text-change">
                    Change: Rs. {change.toFixed(2)}
                  </p>
                )}
              </div>
            )}

            <Button
              className="w-full"
              onClick={handleCompleteSale}
              disabled={createSale.isPending}
              data-testid="button-complete-sale"
            >
              {createSale.isPending ? "Processing..." : "Complete Sale"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
