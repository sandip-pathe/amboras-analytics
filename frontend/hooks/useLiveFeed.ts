"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

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
  const rangeStartDate = range?.startDate;
  const rangeEndDate = range?.endDate;
  const rangeKey = `${rangeStartDate ?? ""}:${rangeEndDate ?? ""}`;
  const [liveEventsByRange, setLiveEventsByRange] = useState<{
    rangeKey: string;
    events: ActivityEvent[];
  }>({ rangeKey, events: [] });
  const [isConnected, setIsConnected] = useState(false);

  const inRange = useCallback(
    (timestamp: string) => {
      if (!rangeStartDate && !rangeEndDate) {
        return true;
      }

      const eventMs = new Date(timestamp).getTime();
      if (Number.isNaN(eventMs)) {
        return false;
      }

      if (rangeStartDate) {
        const start = new Date(rangeStartDate);
        start.setUTCHours(0, 0, 0, 0);
        if (eventMs < start.getTime()) {
          return false;
        }
      }

      if (rangeEndDate) {
        const end = new Date(rangeEndDate);
        end.setUTCHours(23, 59, 59, 999);
        if (eventMs > end.getTime()) {
          return false;
        }
      }

      return true;
    },
    [rangeEndDate, rangeStartDate],
  );

  const liveEvents = useMemo(
    () =>
      liveEventsByRange.rangeKey === rangeKey ? liveEventsByRange.events : [],
    [liveEventsByRange, rangeKey],
  );

  useEffect(() => {
    const token = localStorage.getItem("amboras_token");
    if (!token) {
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
          setLiveEventsByRange((prev) => {
            const currentEvents = prev.rangeKey === rangeKey ? prev.events : [];
            return {
              rangeKey,
              events: [parsed, ...currentEvents].slice(0, 20),
            };
          });
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
  }, [inRange, rangeKey]);

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
  }, [initialEvents, liveEvents, inRange]);

  return { events, isConnected };
}
