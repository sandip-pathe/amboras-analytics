"use client";

import { useEffect, useMemo, useState } from "react";

type ActivityEvent = {
  eventId: string;
  eventType: string;
  timestamp: string;
  amount: number | null;
  productId: string | null;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export function useLiveFeed(initialEvents?: ActivityEvent[]) {
  const [liveEvents, setLiveEvents] = useState<ActivityEvent[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("amboras_token");
    if (!token) {
      setIsConnected(false);
      return;
    }

    const source = new EventSource(
      `${API_URL}/api/v1/analytics/live?token=${token}`,
    );

    source.onopen = () => {
      setIsConnected(true);
    };

    source.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data) as ActivityEvent;
        setLiveEvents((prev) => [parsed, ...prev].slice(0, 20));
      } catch {
        // Ignore malformed events but keep stream alive.
      }
    };

    source.onerror = () => {
      setIsConnected(false);
    };

    return () => {
      source.close();
      setIsConnected(false);
    };
  }, []);

  const events = useMemo(() => {
    const combined = [...liveEvents, ...(initialEvents ?? [])];
    const seen = new Set<string>();
    const deduped: ActivityEvent[] = [];

    for (const event of combined) {
      const key = `${event.eventId}:${event.timestamp}`;
      if (!seen.has(key)) {
        seen.add(key);
        deduped.push(event);
      }
      if (deduped.length >= 20) {
        break;
      }
    }

    return deduped;
  }, [initialEvents, liveEvents]);

  return { events, isConnected };
}
