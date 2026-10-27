import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";

const formatOnChainData = (entry) => ({
  ...entry,
  shortTxHash: `${entry.txHash?.slice(0, 6)}...${entry.txHash?.slice(-4)}`,
  formattedTime: new Date(entry.timestamp * 1000).toLocaleString(),
  formattedBlock: entry.blockNumber?.toLocaleString(),
});

const OnChainStats = ({ wallet }) => {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!wallet) return;

    const fetchOnChainStats = async () => {
      try {
        const res = await fetch(
          `${process.env.REACT_APP_BACKEND_URL}/api/contract/logs/${wallet}`
        );
        const data = await res.json();

        if (!Array.isArray(data)) throw new Error("Invalid on-chain data");
        const formatted = data.map(formatOnChainData);
        setEntries(formatted);
      } catch (err) {
        console.error("❌ Error fetching on-chain logs:", err);
        toast.error("Failed to fetch on-chain logs.");
      } finally {
        setLoading(false);
      }
    };

    fetchOnChainStats();
  }, [wallet]);

  return (
    <div className="mt-6 p-4 bg-white border rounded shadow">
      <h2 className="text-lg font-bold mb-2">🧾 On-Chain Reports</h2>
      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : entries.length === 0 ? (
        <p className="text-gray-500">No on-chain reports found for this wallet.</p>
      ) : (
        entries.map((entry, idx) => (
          <div key={idx} className="p-3 border-b last:border-none text-sm">
            <p><strong>Wallet:</strong> {entry.wallet}</p>
            <p>
              <strong>Tx Hash:</strong>{" "}
              <a
                href={`https://etherscan.io/tx/${entry.txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 underline"
              >
                {entry.shortTxHash}
              </a>
            </p>
            <p><strong>Block:</strong> {entry.formattedBlock}</p>
            <p><strong>Time:</strong> {entry.formattedTime}</p>
          </div>
        ))
      )}
    </div>
  );
};

export default OnChainStats;
