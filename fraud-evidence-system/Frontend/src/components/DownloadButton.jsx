import { saveAs } from "file-saver";
import axios from "axios";

const DownloadButton = ({ filters, backendUrl }) => {
  const buildQuery = () => {
    const params = new URLSearchParams();

    if (filters.wallet) params.append("wallet", filters.wallet);
    if (filters.status) params.append("status", filters.status);
    if (filters.risk) params.append("riskLevel", filters.risk);

    return params.toString();
  };

  const handleDownload = async (format) => {
    try {
      const query = buildQuery();
      const url = `${backendUrl}/api/reports/export?${query}&format=${format}`;

      const res = await axios.get(url, {
        responseType: "blob",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("authToken")}`, // ✅ fixed
        },
      });

      const blob = new Blob([res.data], {
        type: format === "csv" ? "text/csv" : "application/json",
      });

      saveAs(blob, `fraud_report_${Date.now()}.${format}`);
    } catch (error) {
      if (error.response) {
  console.error("🚨 Download error:", error.response.data);
  alert(error.response.data?.error || "Download failed.");
} else if (error.request) {
  console.error("🚨 No response received:", error.request);
  alert("No response from server.");
} else {
  console.error("🚨 Unknown error:", error.message);
  alert(error.message || "Unknown error occurred.");
}

    }
  };

  return (
    <div className="flex gap-2 mt-4">
      <button onClick={() => handleDownload("csv")} className="bg-blue-600 text-white px-4 py-2 rounded">
        Export CSV
      </button>
      <button onClick={() => handleDownload("json")} className="bg-green-600 text-white px-4 py-2 rounded">
        Export JSON
      </button>
    </div>
  );
};

export default DownloadButton;
