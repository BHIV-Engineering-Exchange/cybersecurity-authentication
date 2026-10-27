import React, { useEffect, useState } from "react";
import axios from "axios";
import { config } from '../utils/config';

const RLFeedbackPanel = () => {
  const [feedbackData, setFeedbackData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFeedback = async () => {
      try {
        const res = await axios.get(`${config.backendUrl}/api/feedback/rl`);
        setFeedbackData(res.data || []);
      } catch (err) {
        console.error("Failed to fetch RL feedback:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchFeedback();
  }, []);

  const sendFeedback = async (id, status) => {
    try {
      await axios.post(`${config.backendUrl}/api/feedback/rl`, {
        decisionId: id,
        feedback: status,
      });
      alert(`Feedback submitted: ${status}`);
    } catch (err) {
      console.error("Feedback error:", err);
      alert("Failed to send feedback.");
    }
  };

  if (loading) return <div>Loading feedback...</div>;

  return (
    <div className="p-4 border rounded shadow-md bg-white mt-8">
      <h2 className="text-xl font-bold mb-4">🤖 RL Feedback Panel</h2>
      {feedbackData.length === 0 ? (
        <div className="text-gray-500">No recent model decisions available.</div>
      ) : (
        <ul className="space-y-4">
          {feedbackData.map((item) => (
            <li key={item.id} className="border p-3 rounded-md">
              <p><strong>Wallet:</strong> {item.wallet}</p>
              <p><strong>Risk Score:</strong> {item.riskScore} / 100</p>
              <p><strong>Confidence:</strong> {item.confidence || "N/A"}%</p>
              <p><strong>Tags:</strong> {(item.tags || []).join(", ")}</p>

              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => sendFeedback(item.id, "correct")}
                  className="bg-green-500 text-white px-3 py-1 rounded"
                >
                  ✅ Correct
                </button>
                <button
                  onClick={() => sendFeedback(item.id, "wrong")}
                  className="bg-red-500 text-white px-3 py-1 rounded"
                >
                  ❌ Wrong
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default RLFeedbackPanel;
