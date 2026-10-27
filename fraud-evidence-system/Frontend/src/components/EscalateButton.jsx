import React, { useState } from "react";
import axios from "axios";
import { config } from '../utils/config';

const EscalateButton = ({ entityId }) => {
  const [escalated, setEscalated] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleEscalate = async () => {
    const confirm = window.confirm(`Are you sure you want to escalate ${entityId}?`);
    if (!confirm) return;

    try {
      setLoading(true);
      
      // Use the new webhook escalation endpoint
      const response = await axios.post(`${config.backendUrl}/api/webhook/manual-escalate`, {
        walletAddress: entityId,
        reason: 'Manual escalation by admin',
        priority: 'HIGH',
        investigatorEmail: 'admin@example.com'
      });

      if (response.data.success) {
        alert(`✅ Escalation triggered successfully!\nCase ID: ${response.data.data.caseId}\nEscalation Level: ${response.data.data.escalationLevel}`);
        setEscalated(true);
      } else {
        alert("❌ Failed to escalate.");
      }
    } catch (err) {
      console.error(err);
      alert("❌ Failed to escalate: " + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      className={`px-4 py-2 rounded text-white ${
        escalated ? "bg-gray-400" : "bg-red-600 hover:bg-red-700"
      }`}
      onClick={handleEscalate}
      disabled={escalated || loading}
    >
      {loading ? "Escalating..." : escalated ? "Escalated" : "🚨 Escalate"}
    </button>
  );
};

export default EscalateButton;
