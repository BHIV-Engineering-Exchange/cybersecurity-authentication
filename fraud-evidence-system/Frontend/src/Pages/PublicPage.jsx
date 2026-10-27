import React, { useState } from "react";
import RiskBadge from "../components/RiskBadge";
import Timeline from "../components/Timeline";
import { toast } from "react-toastify";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
dayjs.extend(relativeTime);

export default function PublicPage() {
  const [wallet, setWallet] = useState("");
  const [result, setResult] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    if (!wallet.trim()) {
      toast.error("Please enter a wallet ID or address.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(
        `${process.env.REACT_APP_BACKEND_URL}/api/wallet-data/${wallet}`
      );
      const data = await res.json();

      if (res.ok) {
        setResult({
          wallet: data.address,
          riskLevel: data.riskScore,
          reportCount: data.totalReports,
          lastReported: data.lastUpdated,
        });
        setTimeline(data.timeline || []);
      } else {
        setResult(null);
        setTimeline([]);
        toast.warn(data?.error || "Wallet not found.");
      }
    } catch (err) {
      toast.error("Network error. Please try again.");
      console.error("❌ Fetch error:", err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6">
      <div className="max-w-3xl mx-auto bg-white p-6 rounded shadow">
        <h1 className="text-2xl font-bold mb-4 text-center">
          🔍 Public Risk Checker
        </h1>

        <div className="flex flex-col sm:flex-row gap-2 mb-4">
          <input
            type="text"
            placeholder="Enter wallet ID or address"
            className="border p-2 rounded w-full"
            value={wallet}
            onChange={(e) => setWallet(e.target.value.trim())}
          />
          <button
            onClick={handleSearch}
            className="btn btn-primary w-full sm:w-auto"
            disabled={loading}
          >
            {loading ? "Checking..." : "Check Risk"}
          </button>
        </div>

        {loading && (
          <p className="text-blue-500 text-sm">Fetching data...</p>
        )}

        {result && (
          <div className="bg-gray-100 p-4 rounded mb-4">
            <p className="text-sm text-gray-600 mb-1">Wallet:</p>
            <p className="text-lg font-semibold">{result.wallet}</p>
            <p className="mt-2">
              Risk Level: <RiskBadge level={result.riskLevel} />
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Reports: {result.reportCount} •{" "}
              Last reported {dayjs(result.lastReported).fromNow()}
            </p>
          </div>
        )}

        {timeline.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold mb-2">Timeline</h2>
            <Timeline reports={timeline} />
          </div>
        )}
      </div>
    </div>
  );
}
