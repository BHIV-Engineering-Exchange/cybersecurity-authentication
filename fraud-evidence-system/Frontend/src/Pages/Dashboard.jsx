// src/Pages/Dashboard.jsx
import React, { useEffect, useState } from "react";
import axios from "axios";
import EventDashboard from "../components/EventDashboard";

const Dashboard = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [walletInput, setWalletInput] = useState("");
  const [submitMessage, setSubmitMessage] = useState("");

  const fetchReports = async () => {
    try {
      const res = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/reports`);
      setReports(res.data?.results || []);
    } catch (err) {
      console.error("Error fetching reports:", err);
      setError("Failed to load reports. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitMessage("");
    if (!walletInput || !/^0x[a-fA-F0-9]{40}$/.test(walletInput)) {
      setSubmitMessage("Enter a valid Ethereum wallet address.");
      return;
    }

    try {
      const res = await axios.post(`${process.env.REACT_APP_BACKEND_URL}/api/public/report`, {
        wallet: walletInput,
      });

      setSubmitMessage("Wallet submitted successfully.");
      setWalletInput(""); // Clear input
      fetchReports(); // Refresh report list
    } catch (err) {
      console.error("Error submitting wallet:", err);
      setSubmitMessage(err.response?.data?.error || "Submission failed.");
    }
  };

  return (
    <div className="p-4">
      <EventDashboard />

      <h1 className="text-xl font-bold mb-4">Submit Wallet for Risk Review</h1>
      <form onSubmit={handleSubmit} className="mb-6 flex items-center gap-2">
        <input
          type="text"
          placeholder="Enter wallet address (0x...)"
          value={walletInput}
          onChange={(e) => setWalletInput(e.target.value)}
          className="border p-2 rounded w-full max-w-md"
        />
        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">
          Submit
        </button>
      </form>

      {submitMessage && (
        <p className="mb-4 text-sm text-gray-700">{submitMessage}</p>
      )}

      <h1 className="text-xl font-bold mb-4">Entity Reports</h1>

      {loading ? (
        <div className="text-gray-500">Loading reports...</div>
      ) : error ? (
        <div className="text-red-600">{error}</div>
      ) : reports.length === 0 ? (
        <div className="text-gray-500">No reports found.</div>
      ) : (
        <ul className="space-y-2">
          {reports.map((report) => (
            <li
              key={report._id}
              className="p-3 bg-white border rounded shadow-sm flex justify-between items-center"
            >
              <div>
                <p className="text-sm text-gray-600">{new Date(report.timestamp).toLocaleString()}</p>
                <p className="font-semibold">{report.entityId || "Unknown Entity"}</p>
              </div>
              <span
                className={`text-xs px-2 py-1 rounded ${
                  report.riskLevel === "high"
                    ? "bg-red-100 text-red-700"
                    : report.riskLevel === "medium"
                    ? "bg-yellow-100 text-yellow-700"
                    : "bg-green-100 text-green-700"
                }`}
              >
                {report.riskLevel || "unknown"}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default Dashboard;
