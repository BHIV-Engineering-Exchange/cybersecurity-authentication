import React, { useState } from "react";
import axios from "axios";
import { config } from '../utils/config';

const CaseExportButton = ({ caseId }) => {
  const [showModal, setShowModal] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const backendURL = config.backendUrl;

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const res = await axios.get(`${backendURL}/api/reports/export/case/${caseId}`);
      const { files } = res.data;

      // Trigger downloads
      if (files?.json) window.open(`${backendURL}${files.json}`, "_blank");
      if (files?.csv) window.open(`${backendURL}${files.csv}`, "_blank");

    } catch (err) {
      alert("❌ Export failed: " + (err.response?.data?.error || err.message));
    } finally {
      setIsExporting(false);
      setShowModal(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="bg-yellow-500 text-white text-xs px-2 py-1 rounded"
      >
        Export Case
      </button>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded shadow max-w-sm w-full">
            <h2 className="text-lg font-bold mb-4">📤 Confirm Export</h2>
            <p className="text-sm mb-4">
              Do you want to export all evidence files for <strong>Case ID: {caseId}</strong>?
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowModal(false)}
                className="px-3 py-1 border rounded"
                disabled={isExporting}
              >
                Cancel
              </button>
              <button
                onClick={handleExport}
                className="px-4 py-1 bg-blue-600 text-white rounded"
                disabled={isExporting}
              >
                {isExporting ? "Exporting..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default CaseExportButton;
