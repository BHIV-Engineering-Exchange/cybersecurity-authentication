import { useEffect, useState } from "react";

export default function LogsViewer() {
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    fetch(`${process.env.REACT_APP_BACKEND_URL}/api/logs`)
      .then(res => res.json())
      .then(data => setLogs(data.logs || []))
      .catch(err => console.error("Failed to load logs", err));
  }, []);

  return (
    <div className="mt-6 bg-black text-green-400 p-4 rounded max-h-64 overflow-y-scroll text-xs">
      <h3 className="font-bold mb-2 text-white">🪵 Backend Logs</h3>
      <pre>{logs.join("\n")}</pre>
    </div>
  );
}
