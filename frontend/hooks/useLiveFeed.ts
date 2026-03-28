"use client";

import { useEffect, useMemo, useState } from "react";

type ActivityEvent = {
  eventId: string;
  eventType: string;
  timestamp: string;
  amount: number | null;
  productId: string | null;
};

type LiveFeedRange = {
  startDate?: string;
  endDate?: string;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export function useLiveFeed(
  initialEvents?: ActivityEvent[],
  range?: LiveFeedRange,
) {
  const [liveEvents, setLiveEvents] = useState<ActivityEvent[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  const inRange = (timestamp: string) => {
    if (!range?.startDate && !range?.endDate) {
      return true;
    }

    const eventMs = new Date(timestamp).getTime();
    if (Number.isNaN(eventMs)) {
      return false;
    }

    if (range.startDate) {
      const start = new Date(range.startDate);
      start.setUTCHours(0, 0, 0, 0);
      if (eventMs < start.getTime()) {
        return false;
      }
    }

    if (range.endDate) {
      const end = new Date(range.endDate);
      end.setUTCHours(23, 59, 59, 999);
      if (eventMs > end.getTime()) {
        return false;
      }
    }

    return true;
  };

  useEffect(() => {
    // Clear buffered SSE events when the selected range changes so previous-range
    // events do not remain visible.
    setLiveEvents([]);
  }, [range?.endDate, range?.startDate]);

  useEffect(() => {
    const token = localStorage.getItem("amboras_token");
    if (!token) {
      setIsConnected(false);
      return;
    }

    let source: EventSource | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let reconnectAttempt = 0;
    let isDisposed = false;

    const clearReconnectTimer = () => {
      if (reconnectTimer !== null) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
    };

    const scheduleReconnect = () => {
      if (isDisposed || reconnectTimer !== null) {
        return;
      }

      reconnectAttempt += 1;
      const cappedAttempt = Math.min(reconnectAttempt, 5);
      const backoffMs = 1000 * 2 ** cappedAttempt;
      const jitterMs = Math.floor(Math.random() * 300);

      reconnectTimer = setTimeout(
        () => {
          reconnectTimer = null;
          connect();
        },
        Math.min(backoffMs + jitterMs, 30_000),
      );
    };

    const connect = () => {
      if (isDisposed) {
        return;
      }

      source = new EventSource(
        `${API_URL}/api/v1/analytics/live?token=${token}`,
      );

      source.onopen = () => {
        reconnectAttempt = 0;
        setIsConnected(true);
      };

      source.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data) as ActivityEvent;
          if (!inRange(parsed.timestamp)) {
            return;
          }
          setLiveEvents((prev) => [parsed, ...prev].slice(0, 20));
        } catch {
          // Ignore malformed events but keep stream alive.
        }
      };

      source.onerror = () => {
        setIsConnected(false);
        source?.close();
        source = null;
        scheduleReconnect();
      };
    };

    connect();

    return () => {
      isDisposed = true;
      clearReconnectTimer();
      source?.close();
      setIsConnected(false);
    };
  }, [range?.endDate, range?.startDate]);

  const events = useMemo(() => {
    const combined = [...liveEvents, ...(initialEvents ?? [])];
    const seen = new Set<string>();
    const deduped: ActivityEvent[] = [];

    for (const event of combined) {
      if (!inRange(event.timestamp)) {
        continue;
      }

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
