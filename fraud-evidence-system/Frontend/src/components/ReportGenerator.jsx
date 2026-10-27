// src/components/ReportGenerator.jsx
import React, { useState } from 'react';
import { toast } from 'react-toastify';

const ReportGenerator = () => {
  const [loading, setLoading] = useState(false);
  const [reportType, setReportType] = useState('case');
  const [caseId, setCaseId] = useState('CASE-001');
  const [entityId, setEntityId] = useState('0x1234567890abcdef');
  const [entities, setEntities] = useState('0x1234567890abcdef,0xfedcba0987654321');
  const [investigationId, setInvestigationId] = useState('INV-001');
  const [format, setFormat] = useState('pdf');
  const [options, setOptions] = useState({
    includeEvidence: true,
    includeRiskEvolution: true,
    includeEscalations: true,
    includeTimeline: true,
    watermark: false
  });

  const handleOptionChange = (option) => {
    setOptions(prev => ({
      ...prev,
      [option]: !prev[option]
    }));
  };

  const getAuthToken = () => {
    return localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
  };

  const downloadFile = (blob, filename) => {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const openHTMLInNewTab = (html) => {
    const newTab = window.open();
    newTab.document.write(html);
    newTab.document.close();
  };

  const generateReport = async () => {
    const token = getAuthToken();
    if (!token) {
      toast.error('Please login first to generate reports');
      return;
    }

    setLoading(true);
    try {
      let endpoint = '';
      let body = { format, ...options };

      switch (reportType) {
        case 'case':
          endpoint = `/api/reports/case/${caseId}`;
          break;
        case 'entity':
          endpoint = `/api/reports/entity/${entityId}`;
          break;
        case 'linked':
          endpoint = `/api/reports/linked`;
          body.entities = entities.split(',').map(e => e.trim());
          body.investigationId = investigationId;
          break;
        default:
          throw new Error('Invalid report type');
      }

      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });

      if (response.ok) {
        if (format === 'pdf') {
          const blob = await response.blob();
          const filename = `${reportType}-report-${Date.now()}.pdf`;
          downloadFile(blob, filename);
          toast.success('✅ PDF report generated and downloaded!');
        } else {
          const html = await response.text();
          openHTMLInNewTab(html);
          toast.success('✅ HTML report opened in new tab!');
        }
      } else {
        const error = await response.json();
        toast.error(`❌ Error: ${error.error || 'Failed to generate report'}`);
      }
    } catch (error) {
      console.error('Report generation error:', error);
      toast.error(`❌ Request failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const previewReport = async () => {
    const token = getAuthToken();
    if (!token) {
      toast.error('Please login first to preview reports');
      return;
    }

    try {
      let endpoint = '';
      switch (reportType) {
        case 'case':
          endpoint = `/api/reports/preview/case/${caseId}`;
          break;
        case 'entity':
          endpoint = `/api/reports/preview/entity/${entityId}`;
          break;
        default:
          toast.error('Preview not available for linked reports');
          return;
      }

      const url = `${process.env.REACT_APP_BACKEND_URL}${endpoint}`;
      window.open(url, '_blank');
    } catch (error) {
      console.error('Preview error:', error);
      toast.error(`❌ Preview failed: ${error.message}`);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
      <div className="flex items-center space-x-3 mb-6">
        <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center">
          <span className="text-white text-lg">📄</span>
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">Styled PDF Report Generator</h2>
          <p className="text-sm text-gray-600">Generate professional reports with case summaries, evidence hashes, and risk evolution</p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Report Type Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Report Type</label>
          <select
            value={reportType}
            onChange={(e) => setReportType(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          >
            <option value="case">Case Report</option>
            <option value="entity">Entity Report</option>
            <option value="linked">Linked Investigation Report</option>
          </select>
        </div>

        {/* Dynamic Input Fields */}
        {reportType === 'case' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Case ID</label>
            <input
              type="text"
              value={caseId}
              onChange={(e) => setCaseId(e.target.value)}
              placeholder="e.g., CASE-001"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
        )}

        {reportType === 'entity' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Entity/Wallet Address</label>
            <input
              type="text"
              value={entityId}
              onChange={(e) => setEntityId(e.target.value)}
              placeholder="e.g., 0x1234567890abcdef"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
        )}

        {reportType === 'linked' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Entities (comma-separated)</label>
              <input
                type="text"
                value={entities}
                onChange={(e) => setEntities(e.target.value)}
                placeholder="e.g., 0x1234567890abcdef,0xfedcba0987654321"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Investigation ID</label>
              <input
                type="text"
                value={investigationId}
                onChange={(e) => setInvestigationId(e.target.value)}
                placeholder="e.g., INV-001"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
          </div>
        )}

        {/* Format Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Output Format</label>
          <div className="flex space-x-4">
            <label className="flex items-center">
              <input
                type="radio"
                value="pdf"
                checked={format === 'pdf'}
                onChange={(e) => setFormat(e.target.value)}
                className="mr-2"
              />
              <span className="text-sm">PDF (Download)</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                value="html"
                checked={format === 'html'}
                onChange={(e) => setFormat(e.target.value)}
                className="mr-2"
              />
              <span className="text-sm">HTML (Preview)</span>
            </label>
          </div>
        </div>

        {/* Report Options */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">Report Sections</label>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={options.includeEvidence}
                onChange={() => handleOptionChange('includeEvidence')}
                className="mr-2"
              />
              <span className="text-sm">Evidence Details</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={options.includeTimeline}
                onChange={() => handleOptionChange('includeTimeline')}
                className="mr-2"
              />
              <span className="text-sm">Timeline</span>
            </label>
            {(reportType === 'case' || reportType === 'linked') && (
              <>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={options.includeRiskEvolution}
                    onChange={() => handleOptionChange('includeRiskEvolution')}
                    className="mr-2"
                  />
                  <span className="text-sm">Risk Evolution</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={options.includeEscalations}
                    onChange={() => handleOptionChange('includeEscalations')}
                    className="mr-2"
                  />
                  <span className="text-sm">Escalation Trail</span>
                </label>
              </>
            )}
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={options.watermark}
                onChange={() => handleOptionChange('watermark')}
                className="mr-2"
              />
              <span className="text-sm">Confidential Watermark</span>
            </label>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-3">
          <button
            onClick={generateReport}
            disabled={loading}
            className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Generating...
              </>
            ) : (
              <>
                📄 Generate {format.toUpperCase()} Report
              </>
            )}
          </button>
          
          {(reportType === 'case' || reportType === 'entity') && (
            <button
              onClick={previewReport}
              disabled={loading}
              className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200"
            >
              👁️ Quick Preview
            </button>
          )}
        </div>

        {/* Report Features */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-800 mb-2">✨ Report Features:</h4>
          <ul className="text-xs text-gray-600 space-y-1">
            <li>• Professional gradient headers and clean typography</li>
            <li>• Executive summary with key statistics</li>
            <li>• SHA-256 evidence hashes with verification status</li>
            <li>• Risk score evolution timeline</li>
            <li>• Complete escalation history and audit trail</li>
            <li>• Legal compliance documentation</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ReportGenerator;