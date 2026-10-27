import { useState } from "react";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "./../styles/Button.css";

dayjs.extend(relativeTime);

function PublicStatus() {
  const [wallet, setWallet] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLookup = async () => {
    if (!wallet || wallet.length < 10) {
      setError("Please enter a valid wallet address.");
      return;
    }

    setLoading(true);
    setError("");
    setData(null);

    try {
      const res = await fetch(`http://localhost:5050/api/public/wallet/${wallet}`);
      if (!res.ok) throw new Error("Wallet not found or server error");

      const result = await res.json();
      setData(result);
    } catch (err) {
      console.error("❌ Fetch error:", err);
      setError("No data found for this wallet or server is offline.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-xl mx-auto min-h-screen bg-gray-50">
      <h2 className="text-2xl font-bold mb-4 text-center">
        🔍 Public Wallet Risk Checker
      </h2>

      <input
        type="text"
        aria-label="Wallet address"
        className="border p-2 w-full mb-2 rounded text-sm"
        placeholder="Enter wallet address (0x...)"
        value={wallet}
        onChange={(e) => setWallet(e.target.value)}
      />
      <button
        onClick={handleLookup}
        className="btn btn-primary w-full mb-4"
        disabled={loading}
      >
        {loading ? "Checking..." : "Check Wallet"}
      </button>

      {error && (
        <p className="text-red-600 text-sm text-center">{error}</p>
      )}

      {data && (
        <div className="bg-white border rounded p-4 shadow mt-4">
          <p className="mb-2">
            <strong>Risk Level:</strong>{" "}
            <span
              className={
                data.risk === "high"
                  ? "text-red-600"
                  : data.risk === "medium"
                  ? "text-yellow-600"
                  : "text-green-600"
              }
            >
              {data.risk?.toUpperCase() || "UNKNOWN"}
            </span>
          </p>

          {Array.isArray(data?.flags) && data.flags.length > 0 ? (
            <>
              <h4 className="mt-4 font-semibold text-sm">📌 Recent Flags:</h4>
              <ul className="list-disc pl-5 mt-2 text-sm">
                {data.flags.map((report, idx) => (
                  <li key={idx} className="mb-2">
                    🕒 {dayjs(report.timestamp).fromNow()}
                    {report.tx ? (
                      <a
                        href={`https://sepolia.etherscan.io/tx/${report.tx}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-2 text-blue-600 underline"
                      >
                        View Tx ↗
                      </a>
                    ) : (
                      <span className="ml-2 text-gray-400">(Tx not available)</span>
                    )}
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="text-gray-500 text-sm mt-4">
              No public flags found for this wallet.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default PublicStatus;
