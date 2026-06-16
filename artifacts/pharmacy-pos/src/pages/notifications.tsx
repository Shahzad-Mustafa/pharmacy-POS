import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { customFetch } from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Bell, Check, CheckCheck, Package, AlertTriangle, Clock, Info, ShoppingCart, Pill } from "lucide-react";
import { cn } from "@/lib/utils";

type Notification = {
  id: string;
  type: string;
  channel: string;
  title: string;
  message: string;
  is_read: boolean;
  status: string;
  created_at: string;
  data?: Record<string, any>;
};

const ICON_MAP: Record<string, any> = {
  low_stock: Package,
  expiry_alert: AlertTriangle,
  prescription_ready: Pill,
  sale_complete: ShoppingCart,
  reorder_suggestion: Clock,
};

const TYPE_COLOR: Record<string, string> = {
  low_stock: "text-orange-500",
  expiry_alert: "text-red-500",
  prescription_ready: "text-blue-500",
  sale_complete: "text-green-500",
  reorder_suggestion: "text-purple-500",
};

function NotificationItem({ n, onMarkRead }: { n: Notification; onMarkRead: (id: string) => void }) {
  const Icon = ICON_MAP[n.type] ?? Info;
  const colorClass = TYPE_COLOR[n.type] ?? "text-muted-foreground";

  return (
    <div
      className={cn(
        "flex items-start gap-3 p-4 border-b last:border-b-0 transition-colors",
        !n.is_read && "bg-blue-50/50 dark:bg-blue-950/20"
      )}
    >
      <div className={cn("mt-0.5 shrink-0", colorClass)}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={cn("text-sm font-medium", !n.is_read && "font-semibold")}>{n.title}</p>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-muted-foreground">{new Date(n.created_at).toLocaleString()}</span>
            {!n.is_read && (
              <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => onMarkRead(n.id)} title="Mark as read">
                <Check className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
        <p className="text-sm text-muted-foreground mt-0.5">{n.message}</p>
        <div className="flex items-center gap-2 mt-1">
          <Badge variant="outline" className="text-xs capitalize">{n.type.replace(/_/g, " ")}</Badge>
          <Badge variant="outline" className="text-xs capitalize">{n.channel}</Badge>
          {!n.is_read && <span className="h-2 w-2 rounded-full bg-blue-500" />}
        </div>
      </div>
    </div>
  );
}

function PreferencesPanel() {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [prefs, setPrefs] = useState<Record<string, Record<string, boolean>>>({});

  const { data, isLoading } = useQuery({
    queryKey: ["notification-preferences", user?.id],
    queryFn: () => customFetch(`/api/notifications/preferences`),
    enabled: !!user?.id,
  });

  const saveMutation = useMutation({
    mutationFn: (payload: any) =>
      customFetch(`/api/notifications/preferences`, { method: "PUT", body: JSON.stringify({ preferences: payload }) }),
    onSuccess: () => {
      toast({ title: "Preferences saved" });
      qc.invalidateQueries({ queryKey: ["notification-preferences"] });
    },
    onError: () => toast({ title: "Failed to save preferences", variant: "destructive" }),
  });

  const notifTypes = [
    { key: "low_stock", label: "Low Stock Alerts" },
    { key: "expiry_alert", label: "Expiry Alerts" },
    { key: "prescription_ready", label: "Prescription Ready" },
    { key: "sale_complete", label: "Sale Completed" },
    { key: "reorder_suggestion", label: "Reorder Suggestions" },
    { key: "daily_summary", label: "Daily Summary Report" },
  ];

  const channels = ["app", "email", "sms", "whatsapp"];

  const getVal = (type: string, ch: string) => prefs[type]?.[ch] ?? (data as any)?.preferences?.[type]?.[ch] ?? false;
  const toggle = (type: string, ch: string) => setPrefs(p => ({ ...p, [type]: { ...(p[type] ?? {}), [ch]: !getVal(type, ch) } }));

  if (isLoading) return <Skeleton className="h-48 w-full" />;

  const merged = { ...((data as any)?.preferences ?? {}), ...prefs };

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-muted-foreground">
              <th className="text-left py-2 pr-4 font-medium">Notification Type</th>
              {channels.map(ch => (
                <th key={ch} className="px-3 py-2 text-center font-medium capitalize">{ch}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {notifTypes.map(nt => (
              <tr key={nt.key} className="border-t">
                <td className="py-3 pr-4">{nt.label}</td>
                {channels.map(ch => (
                  <td key={ch} className="px-3 py-3 text-center">
                    <Switch
                      checked={getVal(nt.key, ch)}
                      onCheckedChange={() => toggle(nt.key, ch)}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Button onClick={() => saveMutation.mutate(merged)} disabled={saveMutation.isPending}>
        {saveMutation.isPending ? "Saving…" : "Save Preferences"}
      </Button>
    </div>
  );
}

export default function Notifications() {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [typeFilter, setTypeFilter] = useState("all");
  const [unreadOnly, setUnreadOnly] = useState(false);

  const { data, isLoading } = useQuery<{ data: Notification[]; pagination: any }>({
    queryKey: ["notifications", typeFilter, unreadOnly, user?.id],
    queryFn: () => {
      const params = new URLSearchParams();
      if (typeFilter !== "all") params.set("type", typeFilter);
      if (unreadOnly) params.set("unread", "true");
      return customFetch(`/api/notifications?${params}`);
    },
    enabled: !!user?.id,
  });

  const notifications = (data as any)?.data ?? (Array.isArray(data) ? data : []);
  const unreadCount = notifications.filter((n: Notification) => !n.is_read).length;

  const markReadMutation = useMutation({
    mutationFn: (id: string) => customFetch(`/api/notifications/${id}/read`, { method: "PUT" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => customFetch(`/api/notifications/read-all`, { method: "PUT" }),
    onSuccess: () => {
      toast({ title: "All notifications marked as read" });
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Notifications</h1>
          {unreadCount > 0 && (
            <Badge className="ml-1">{unreadCount} unread</Badge>
          )}
        </div>
        {unreadCount > 0 && (
          <Button size="sm" variant="outline" onClick={() => markAllReadMutation.mutate()} disabled={markAllReadMutation.isPending}>
            <CheckCheck className="h-4 w-4 mr-1" /> Mark all read
          </Button>
        )}
      </div>

      <Tabs defaultValue="inbox">
        <TabsList>
          <TabsTrigger value="inbox">Inbox</TabsTrigger>
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
        </TabsList>

        <TabsContent value="inbox" className="mt-4 space-y-3">
          <div className="flex items-center gap-3 flex-wrap">
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="low_stock">Low Stock</SelectItem>
                <SelectItem value="expiry_alert">Expiry Alert</SelectItem>
                <SelectItem value="prescription_ready">Prescription Ready</SelectItem>
                <SelectItem value="sale_complete">Sale Complete</SelectItem>
                <SelectItem value="reorder_suggestion">Reorder Suggestion</SelectItem>
                <SelectItem value="daily_summary">Daily Summary</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2">
              <Switch id="unread-only" checked={unreadOnly} onCheckedChange={setUnreadOnly} />
              <Label htmlFor="unread-only">Unread only</Label>
            </div>
          </div>

          <Card>
            {isLoading ? (
              <CardContent className="p-4 space-y-3">
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
              </CardContent>
            ) : notifications.length === 0 ? (
              <CardContent className="py-16 flex flex-col items-center gap-3 text-muted-foreground">
                <Bell className="h-12 w-12 opacity-20" />
                <p>No notifications</p>
              </CardContent>
            ) : (
              <div>
                {notifications.map((n: Notification) => (
                  <NotificationItem key={n.id} n={n} onMarkRead={id => markReadMutation.mutate(id)} />
                ))}
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="preferences" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Notification Preferences</CardTitle>
            </CardHeader>
            <CardContent>
              <PreferencesPanel />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
