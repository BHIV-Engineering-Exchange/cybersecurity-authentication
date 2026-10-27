import React, { useState } from "react";

const EnforcementPanel = () => {
  const [wallet, setWallet] = useState("");
  const [reason, setReason] = useState("");
  
  // Get token from localStorage (or update based on your setup)
  const token = localStorage.getItem("token");

  // Proper auth headers
  const authHeaders = {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
  };

  const handleFreeze = async () => {
    try {
      const res = await fetch(`/api/enforce/freeze/${wallet}`, {
        method: "POST",
        headers: authHeaders,
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || "Freeze failed");
      }
      alert(`${wallet} has been frozen`);
    } catch (err) {
      console.error("Freeze Error:", err);
      alert(`Freeze failed: ${err.message}`);
    }
  };

  const handleUnfreeze = async () => {
    try {
      const res = await fetch(`/api/enforce/unfreeze/${wallet}`, {
        method: "POST",
        headers: authHeaders,
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || "Unfreeze failed");
      }
      alert(`${wallet} has been unfrozen`);
    } catch (err) {
      console.error("Unfreeze Error:", err);
      alert(`Unfreeze failed: ${err.message}`);
    }
  };

  const handleReport = async () => {
    try {
      const res = await fetch(`/api/panic/${wallet}`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          reporterId: "enforcement-panel",
          reason: reason || "Suspicious activity",
          severity: 5,
        }),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || "Report failed");
      }
      alert(`Reported ${wallet} for: ${reason}`);
    } catch (err) {
      console.error("Report Error:", err);
      alert(`Report failed: ${err.message}`);
    }
  };

  const handleTransfer = async () => {
    try {
      const res = await fetch("/api/token/transfer", {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          from: "dead_wallet",
          to: wallet,
          amount: 100,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Transfer failed");
      }

      if (data.shouldFreeze) {
        await handleFreeze();
      } else {
        alert(`Transfer to ${wallet} completed.`);
      }
    } catch (err) {
      console.error("Transfer Error:", err);
      alert(`Transfer failed: ${err.message}`);
    }
  };

  return (
    <div className="p-4 border rounded shadow-lg max-w-md mx-auto">
      <h2 className="text-xl font-bold mb-4">Enforcement Panel</h2>
      <input
        type="text"
        placeholder="Wallet address"
        value={wallet}
        onChange={(e) => setWallet(e.target.value)}
        className="border p-2 w-full mb-2"
      />
      <input
        type="text"
        placeholder="Reason for report (optional)"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        className="border p-2 w-full mb-4"
      />

      <div className="flex flex-wrap gap-2">
        <button onClick={handleFreeze} className="bg-red-500 text-white px-4 py-2 rounded">
          Freeze
        </button>
        <button onClick={handleUnfreeze} className="bg-green-500 text-white px-4 py-2 rounded">
          Unfreeze
        </button>
        <button onClick={handleReport} className="bg-yellow-500 text-black px-4 py-2 rounded">
          Report
        </button>
        <button onClick={handleTransfer} className="bg-blue-500 text-white px-4 py-2 rounded">
          Simulate Transfer + Enforce
        </button>
      </div>
    </div>
  );
};

export default EnforcementPanel;
