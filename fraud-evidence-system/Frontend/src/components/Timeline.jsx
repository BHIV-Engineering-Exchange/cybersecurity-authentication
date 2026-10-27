import { useState } from "react";

export default function Timeline({ reports }) {
  const [sortAsc, setSortAsc] = useState(true);

  // ✅ Sort reports by date
  const sorted = [...reports].sort((a, b) => {
    const dateA = new Date(a.date);
    const dateB = new Date(b.date);
    return sortAsc ? dateA - dateB : dateB - dateA;
  });

  // ✅ Group reports by date
  const grouped = sorted.reduce((acc, rpt) => {
    const d = rpt.date || "Unknown Date";
    (acc[d] = acc[d] || []).push(rpt);
    return acc;
  }, {});

  return (
    <div className="mt-8 px-4 md:px-8">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-xl font-bold text-center mb-4">Incident Timeline</h2>
        <button
          className="text-blue-600 underline"
          onClick={() => setSortAsc(!sortAsc)}
        >
          Sort: {sortAsc ? "Oldest First" : "Newest First"}
        </button>
      </div>

      {sorted.length === 0 ? (
        <p className="text-gray-500">No reports available.</p>
      ) : (
        Object.keys(grouped).map((date) => (
          <div key={date} className="mb-6">
            <h4 className="text-md font-semibold text-gray-700 mb-2">{date}</h4>
            <ul className="space-y-3">
              {grouped[date].map((report, index) => (
                <li
                  key={index}
                  className="flex flex-col sm:flex-row justify-between items-start sm:items-center 
                             bg-white p-4 rounded-md shadow-md border 
                             hover:bg-gray-100 transition duration-200 ease-in-out"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between w-full">
                    <div>
                      {/* ✅ Wallet */}
                      <p className="text-sm text-gray-500">
                        Wallet:{" "}
                        {report.wallet
                          ? `${report.wallet.slice(0, 6)}...${report.wallet.slice(-4)}`
                          : "N/A"}
                      </p>

                      {/* ✅ Risk */}
                      <p className="text-xs text-gray-400">
                        Risk: {(report.risk || "unknown").toUpperCase()}
                      </p>

                      {/* ✅ Txn Hash */}
                      <p className="text-xs text-blue-600">
                        Txn Hash:{" "}
                        <a
                          href={`https://etherscan.io/tx/${report.txnHash || "0x123456789abcdef"}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline"
                        >
                          {report.txnHash
                            ? `${report.txnHash.slice(0, 6)}...${report.txnHash.slice(-4)}`
                            : "0x1234...cdef"}
                        </a>
                      </p>

                      {/* ✅ Source Labels */}
                      {report.source === "contract" && (
                        <p className="text-purple-600 text-sm mt-1">
                          (Flagged by Smart Contract)
                        </p>
                      )}
                      {report.source === "admin" && (
                        <p className="text-red-600 text-sm mt-1">
                          (Manual Escalation)
                        </p>
                      )}
                    </div>

                    {/* ✅ Risk Badge */}
                    <div
                      className="text-sm px-3 py-1 rounded-full font-bold text-white mt-2 sm:mt-0"
                      style={{
                        backgroundColor:
                          report.risk === "high"
                            ? "red"
                            : report.risk === "medium"
                            ? "orange"
                            : report.risk === "low"
                            ? "green"
                            : "gray",
                      }}
                    >
                      {(report.risk || "unknown").toUpperCase()}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))
      )}
    </div>
  );
}
