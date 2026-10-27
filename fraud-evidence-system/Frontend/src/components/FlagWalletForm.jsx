import React, { useState } from "react";
import apiClient from "../api/apiClient";

const FlagWalletForm = () => {
  const [wallet, setWallet] = useState("");
  const [risk, setRisk] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();

    apiClient.post("/api/reports", {
      entityId: wallet,
      riskLevel: risk,
    })
    .then((response) => {
      setMessage("Wallet flagged successfully.");
      setWallet("");
      setRisk("");
    })
    .catch((error) => {
      console.error("Error flagging wallet:", error);
      setMessage("Error submitting report.");
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label>Wallet Address:</label>
        <input
          type="text"
          value={wallet}
          onChange={(e) => setWallet(e.target.value)}
          className="border p-2 w-full"
          required
        />
      </div>
      <div>
        <label>Risk Level:</label>
        <input
          type="text"
          value={risk}
          onChange={(e) => setRisk(e.target.value)}
          className="border p-2 w-full"
          required
        />
      </div>
      <button type="submit" className="bg-blue-500 text-white p-2 rounded">
        Submit
      </button>
      {message && <p>{message}</p>}
    </form>
  );
};

export default FlagWalletForm;
