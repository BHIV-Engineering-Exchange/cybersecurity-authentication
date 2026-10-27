import { useEffect, useState } from "react";

export default function AlertLog() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const res = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/events?limit=20`);
        const data = await res.json();

        console.log("✅ Fetched data:", data); // Optional: debug log

        // Ensure we only set if it's an array
        setEvents(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("❌ Failed to load alerts:", err);
        setEvents([]); // fallback
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);

  return (
    <div className="mt-6">
      <h2 className="text-lg font-semibold mb-2">🔔 Recent High-Risk Alerts</h2>
      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : events.length === 0 ? (
        <p className="text-gray-500">No alerts yet.</p>
      ) : (
        <ul className="space-y-2">
          {events.map((evt) => (
            <li key={evt._id} className="p-3 border rounded bg-gray-50 text-sm">
              <div><b>Wallet:</b> {evt.payload?.entityId || "N/A"}</div>
              <div><b>Report ID:</b> {evt.payload?.reportId || "N/A"}</div>
              <div><b>At:</b> {new Date(evt.createdAt).toLocaleString()}</div>

              {/* ✅ Source Tag */}
              {evt.payload?.source === "contract" && (
                <span className="inline-block mt-1 text-xs font-medium bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
                  Flagged via Contract
                </span>
              )}
              {evt.payload?.source === "admin" && (
                <span className="inline-block mt-1 text-xs font-medium bg-red-100 text-red-700 px-2 py-1 rounded-full">
                  Escalated by Admin
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
