import { useEffect, useState } from "react";
import { fetchRecentEvents } from "../api/eventApi";

export function useEventPolling(intervalMs = 5050) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function load() {
      const token = localStorage.getItem("authToken");

      if (!token) {
        console.warn("⚠️ No auth token found for polling /api/events");
        if (mounted) setLoading(false);
        return;
      }

      try {
        const data = await fetchRecentEvents();
        if (mounted) setEvents(data);
      } catch (err) {
        console.error("❌ Failed to load events:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    const interval = setInterval(load, intervalMs);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [intervalMs]);

  return { events, loading };
}
