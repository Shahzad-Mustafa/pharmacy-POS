import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { customFetch } from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { getNotifPriority, type NotifPriority } from "@/hooks/use-notifications";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Bell, Check, CheckCheck, Package, AlertTriangle, Clock,
  Info, ShoppingCart, Pill, ExternalLink, XCircle, ArrowUpDown,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
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

const PRIORITY_CONFIG: Record<NotifPriority, { label: string; icon: any; badgeClass: string; rowClass: string; iconClass: string }> = {
  critical: {
    label: "Critical",
    icon: XCircle,
    badgeClass: "bg-red-100 text-red-700 border-red-300 dark:bg-red-950 dark:text-red-300",
    rowClass: "border-l-4 border-l-red-500 bg-red-50/40 dark:bg-red-950/20",
    iconClass: "text-red-500",
  },
  warning: {
    label: "Warning",
    icon: AlertTriangle,
    badgeClass: "bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-950 dark:text-orange-300",
    rowClass: "border-l-4 border-l-orange-400 bg-orange-50/40 dark:bg-orange-950/20",
    iconClass: "text-orange-500",
  },
  info: {
    label: "Info",
    icon: Info,
    badgeClass: "bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-950 dark:text-blue-300",
    rowClass: "border-l-4 border-l-blue-400 bg-blue-50/30 dark:bg-blue-950/10",
    iconClass: "text-blue-500",
  },
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function NotificationItem({ n, onMarkRead, isPending }: { n: Notification; onMarkRead: (id: string) => void; isPending?: boolean }) {
  const TypeIcon = ICON_MAP[n.type] ?? Info;
  const priority = getNotifPriority(n);
  const cfg = PRIORITY_CONFIG[priority];
  const PriorityIcon = cfg.icon;

  return (
    <div
      className={cn(
        "flex items-start gap-3 p-4 border-b last:border-b-0 transition-all",
        n.is_read ? "bg-muted/20 opacity-60" : cfg.rowClass
      )}
    >
      {/* Type icon */}
      <div className={cn("mt-0.5 shrink-0 p-1.5 rounded-md", n.is_read ? "bg-muted" : "bg-white dark:bg-card shadow-sm")}>
        <TypeIcon className={cn("h-4 w-4", n.is_read ? "text-muted-foreground" : cfg.iconClass)} />
      </div>

      <div className="flex-1 min-w-0">
        {/* Title row */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <p className={cn("text-sm", !n.is_read && "font-semibold")}>{n.title}</p>
            {!n.is_read && (
              <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", cfg.badgeClass)}>
                <PriorityIcon className="h-2.5 w-2.5 mr-1" />
                {cfg.label}
              </Badge>
            )}
            {n.is_read && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground">
                <Check className="h-2.5 w-2.5 mr-1" /> Read
              </Badge>
            )}
          </div>
          <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0" title={new Date(n.created_at).toLocaleString()}>
            {timeAgo(n.created_at)}
          </span>
        </div>

        {/* Message */}
        <p className="text-sm text-muted-foreground mt-0.5 leading-relaxed">{n.message}</p>

        {/* Footer actions */}
        <div className="flex items-center justify-between mt-3 flex-wrap gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="text-[10px] capitalize">{n.type.replace(/_/g, " ")}</Badge>
            {!n.is_read && <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />}
            {n.data?.medicine_id && (
              <Link href="/inventory">
                <Button variant="link" size="sm" className="h-auto p-0 text-xs text-primary">
                  <ExternalLink className="h-3 w-3 mr-1" />
                  View Inventory
                </Button>
              </Link>
            )}
            {n.data?.medicine_name && (
              <span className="text-xs text-muted-foreground font-mono">{n.data.medicine_name}</span>
            )}
          </div>

          {!n.is_read && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2.5 text-xs gap-1.5 shrink-0"
              onClick={() => onMarkRead(n.id)}
              disabled={isPending}
            >
              <Check className="h-3 w-3" />
              Mark as read
            </Button>
          )}
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
    { key: "low_stock",           label: "Low Stock Alerts",      priority: "critical" as NotifPriority },
    { key: "expiry_alert",        label: "Expiry Alerts",          priority: "warning" as NotifPriority },
    { key: "prescription_ready",  label: "Prescription Ready",     priority: "info" as NotifPriority },
    { key: "sale_complete",       label: "Sale Completed",         priority: "info" as NotifPriority },
    { key: "reorder_suggestion",  label: "Reorder Suggestions",    priority: "info" as NotifPriority },
    { key: "daily_summary",       label: "Daily Summary Report",   priority: "info" as NotifPriority },
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
              <th className="text-left py-2 pr-4 font-medium">Priority</th>
              {channels.map(ch => (
                <th key={ch} className="px-3 py-2 text-center font-medium capitalize">{ch}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {notifTypes.map(nt => {
              const cfg = PRIORITY_CONFIG[nt.priority];
              return (
                <tr key={nt.key} className="border-t">
                  <td className="py-3 pr-4">{nt.label}</td>
                  <td className="py-3 pr-4">
                    <Badge variant="outline" className={cn("text-[10px]", cfg.badgeClass)}>{cfg.label}</Badge>
                  </td>
                  {channels.map(ch => (
                    <td key={ch} className="px-3 py-3 text-center">
                      <Switch checked={getVal(nt.key, ch)} onCheckedChange={() => toggle(nt.key, ch)} />
                    </td>
                  ))}
                </tr>
              );
            })}
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
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");

  const { data, isLoading } = useQuery<{ data: Notification[]; pagination: any }>({
    queryKey: ["notifications", typeFilter, unreadOnly, priorityFilter, user?.id],
    queryFn: () => {
      const params = new URLSearchParams();
      if (typeFilter !== "all") params.set("type", typeFilter);
      if (unreadOnly) params.set("is_read", "false");
      return customFetch(`/api/notifications?${params}&per_page=100`);
    },
    enabled: !!user?.id,
    refetchInterval: 30_000,
  });

  let notifications: Notification[] = (data as any)?.data ?? (Array.isArray(data) ? data : []);

  if (priorityFilter !== "all") {
    notifications = notifications.filter((n) => getNotifPriority(n) === priorityFilter);
  }

  // Always sort by created_at after filtering
  notifications = [...notifications].sort((a, b) => {
    const diff = new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    return sortOrder === "desc" ? diff : -diff;
  });

  const criticalCount = notifications.filter((n) => !n.is_read && getNotifPriority(n) === "critical").length;
  const warningCount = notifications.filter((n) => !n.is_read && getNotifPriority(n) === "warning").length;
  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const markReadMutation = useMutation({
    mutationFn: (id: string) => customFetch(`/api/notifications/${id}/read`, { method: "PATCH" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
      qc.invalidateQueries({ queryKey: ["notifications-global"] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => customFetch(`/api/notifications/read-all`, { method: "PATCH" }),
    onSuccess: () => {
      toast({ title: "All notifications marked as read" });
      qc.invalidateQueries({ queryKey: ["notifications"] });
      qc.invalidateQueries({ queryKey: ["notifications-global"] });
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications"
        subtitle={unreadCount > 0 ? `${unreadCount} unread${criticalCount > 0 ? ` · ${criticalCount} critical` : ""}` : "All caught up"}
        icon={Bell}
        gradient="from-orange-600 via-orange-500 to-amber-500"
        actions={
          unreadCount > 0 ? (
            <Button className="bg-white/20 border-white/30 text-white hover:bg-white/30 border" size="sm" onClick={() => markAllReadMutation.mutate()} disabled={markAllReadMutation.isPending}>
              <CheckCheck className="h-4 w-4 mr-1" /> Mark all read
            </Button>
          ) : undefined
        }
      />

      {/* Summary cards for unread critical/warning */}
      {(criticalCount > 0 || warningCount > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {criticalCount > 0 && (
            <button
              className="flex items-center gap-3 p-3 rounded-lg border-2 border-red-300 bg-red-50 dark:bg-red-950/30 text-left hover:bg-red-100 dark:hover:bg-red-950/50 transition-colors cursor-pointer"
              onClick={() => { setUnreadOnly(true); setPriorityFilter("critical"); }}
            >
              <XCircle className="h-8 w-8 text-red-500 shrink-0" />
              <div>
                <p className="font-bold text-red-700 dark:text-red-400 text-lg">{criticalCount}</p>
                <p className="text-sm text-red-600 dark:text-red-400">Critical alerts require immediate action</p>
              </div>
            </button>
          )}
          {warningCount > 0 && (
            <button
              className="flex items-center gap-3 p-3 rounded-lg border-2 border-orange-300 bg-orange-50 dark:bg-orange-950/30 text-left hover:bg-orange-100 dark:hover:bg-orange-950/50 transition-colors cursor-pointer"
              onClick={() => { setUnreadOnly(true); setPriorityFilter("warning"); }}
            >
              <AlertTriangle className="h-8 w-8 text-orange-500 shrink-0" />
              <div>
                <p className="font-bold text-orange-700 dark:text-orange-400 text-lg">{warningCount}</p>
                <p className="text-sm text-orange-600 dark:text-orange-400">Warnings need your attention</p>
              </div>
            </button>
          )}
        </div>
      )}

      <Tabs defaultValue="inbox">
        <TabsList>
          <TabsTrigger value="inbox">Inbox</TabsTrigger>
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
        </TabsList>

        <TabsContent value="inbox" className="mt-4 space-y-3">
          <div className="flex items-center gap-3 flex-wrap">
            <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v)}>
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
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="warning">Warning</SelectItem>
                <SelectItem value="info">Info</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2">
              <Switch id="unread-only" checked={unreadOnly} onCheckedChange={setUnreadOnly} />
              <Label htmlFor="unread-only">Unread only</Label>
            </div>
            {(priorityFilter !== "all" || unreadOnly) && (
              <Button size="sm" variant="ghost" onClick={() => { setPriorityFilter("all"); setUnreadOnly(false); }}>
                Clear filters
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              className="ml-auto gap-1.5"
              onClick={() => setSortOrder(s => s === "desc" ? "asc" : "desc")}
              title={sortOrder === "desc" ? "Newest first" : "Oldest first"}
            >
              <ArrowUpDown className="h-3.5 w-3.5" />
              {sortOrder === "desc" ? "Newest first" : "Oldest first"}
            </Button>
          </div>

          <Card>
            {isLoading ? (
              <CardContent className="p-4 space-y-3">
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
              </CardContent>
            ) : notifications.length === 0 ? (
              <CardContent className="py-16 flex flex-col items-center gap-3 text-muted-foreground">
                <Bell className="h-12 w-12 opacity-20" />
                <p>No notifications</p>
              </CardContent>
            ) : (
              <div>
                {notifications.map((n: Notification) => (
                  <NotificationItem
                    key={n.id}
                    n={n}
                    onMarkRead={id => markReadMutation.mutate(id)}
                    isPending={markReadMutation.isPending}
                  />
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
