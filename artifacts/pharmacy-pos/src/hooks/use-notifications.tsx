import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { customFetch } from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";

export type NotifPriority = "critical" | "warning" | "info";

export function getNotifPriority(n: any): NotifPriority {
  if (n.type === "low_stock") {
    const remaining = n.data?.remaining ?? 1;
    return remaining === 0 ? "critical" : "warning";
  }
  if (n.type === "expiry_alert") return "warning";
  return "info";
}

const SEEN_KEY = "rxpos_notif_seen";

function loadSeenIds(): Set<string> {
  try {
    const raw = localStorage.getItem(SEEN_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function saveSeenIds(ids: Set<string>) {
  try {
    // Cap at 500 most recent to avoid unbounded growth
    const arr = Array.from(ids).slice(-500);
    localStorage.setItem(SEEN_KEY, JSON.stringify(arr));
  } catch {}
}

export function useNotifications() {
  const { user } = useAuth();
  // seenIds persists across remounts via localStorage
  const seenIdsRef = useRef<Set<string>>(loadSeenIds());
  // per-mount flag: true until first successful data load
  const initializedRef = useRef(false);

  const { data, isSuccess } = useQuery({
    queryKey: ["notifications-global", user?.id],
    queryFn: () => customFetch(`/api/notifications?per_page=50`),
    enabled: !!user,
    refetchInterval: 30_000,
    staleTime: 25_000,
  });

  const all: any[] = (data as any)?.data ?? (Array.isArray(data) ? data : []);
  const unreadNotifs = all.filter((n) => !n.is_read);
  const unreadCount = unreadNotifs.length;

  useEffect(() => {
    if (!isSuccess) return;

    if (!initializedRef.current) {
      // First successful load this session — mark all existing as seen, no toasts
      initializedRef.current = true;
      unreadNotifs.forEach((n) => seenIdsRef.current.add(n.id));
      saveSeenIds(seenIdsRef.current);
      return;
    }

    // Subsequent loads — only toast truly new IDs (not in localStorage)
    const newOnes = unreadNotifs.filter((n) => !seenIdsRef.current.has(n.id));
    if (!newOnes.length) return;

    newOnes.forEach((n) => {
      seenIdsRef.current.add(n.id);
      const priority = getNotifPriority(n);
      const action = n.data?.medicine_id
        ? { label: "View Inventory", onClick: () => (window.location.href = "/inventory") }
        : undefined;

      if (priority === "critical") {
        toast.error(n.title, { description: n.message, duration: 10_000, action });
      } else if (priority === "warning") {
        toast.warning(n.title, { description: n.message, duration: 7_000, action });
      } else {
        toast.info(n.title, { description: n.message, duration: 5_000 });
      }
    });

    saveSeenIds(seenIdsRef.current);
  }, [isSuccess, unreadNotifs.map((n) => n.id).join(",")]);

  return { unreadCount, unreadNotifs };
}
