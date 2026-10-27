import React from "react";
import { useEventPolling } from "../hooks/useEventPolling";

export default function EventDashboard() {
  const { events, loading } = useEventPolling(5050); // Poll every 5 sec

  return (
    <div style={{ padding: "1rem" }}>
      <h2>🚨 Recent Flagged Wallets</h2>
      {loading ? (
        <p>Loading events...</p>
      ) : events.length === 0 ? (
        <p>No events yet.</p>
      ) : (
        <ul style={{ listStyle: "none", paddingLeft: 0 }}>
          {events.map((event) => (
            <li
              key={event._id}
              style={{
                background: "#f8f8f8",
                border: "1px solid #ddd",
                marginBottom: "0.5rem",
                padding: "0.5rem",
                borderRadius: "4px",
              }}
            >
              <strong>Wallet:</strong> {event.payload.entityId}<br />
              <strong>Report ID:</strong> {event.payload.reportId}<br />
              <strong>Time:</strong>{" "}
              {new Date(event.createdAt).toLocaleString()}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
