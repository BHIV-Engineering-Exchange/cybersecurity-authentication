//routes/exportRoutes.js
const express = require('express');
const router = express.Router();
const Report = require('../models/Report');
const { Parser } = require('json2csv');
const authMiddleware = require('../middleware/auth');
const adminOnly = require('../middleware/adminOnly');

const {
  exportCaseFiles,
  getExportedFile
} = require('../controllers/exportController');

// ✅ Export reports with optional filters
router.get('/export', authMiddleware, adminOnly, async (req, res) => {
  try {
    const {
      wallet,
      severity,
      fromDate,
      toDate,
      status,
      riskLevel,
      caseId,
      format = 'csv'
    } = req.query;

    const query = {};
    if (wallet) query.wallet = wallet;
    if (severity) query.severity = Number(severity);
    if (status) query.status = status;
    if (riskLevel) query.riskLevel = riskLevel;
    if (caseId) query.caseId = caseId;

    if (fromDate || toDate) {
      query.createdAt = {};
      if (fromDate) query.createdAt.$gte = new Date(fromDate);
      if (toDate) query.createdAt.$lte = new Date(toDate);
    }

    const reports = await Report.find(query).sort({ createdAt: -1 }).lean();

    if (!reports.length) {
      return res.status(404).json({ error: 'No reports found to export.' });
    }

    const cleanedReports = reports.map((r) => ({
      _id: r._id,
      caseId: r.caseId || "N/A",
      wallet: r.wallet || "N/A",
      severity: r.severity ?? "N/A",
      riskLevel: r.riskLevel || "N/A",
      status: r.status || "N/A",
      reason: r.reason || "N/A",
      evidenceHashes: (r.evidenceHashes || []).join(', '),
      city: r.ipGeo?.city || "Unknown",
      org: r.ipGeo?.org || "Unknown",
      escalationTrail: (r.escalationLog || [])
        .map(e => `${e.status} (${new Date(e.timestamp).toLocaleString()})`)
        .join(' → '),
      createdAt: r.createdAt ? r.createdAt.toISOString() : "N/A"
    }));

    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename=fraud_reports_${Date.now()}.json`);
      return res.status(200).json(cleanedReports);
    }

    // Fallback to CSV
    const fields = [
      { label: 'ID', value: '_id' },
      { label: 'Case ID', value: 'caseId' },
      { label: 'Wallet', value: 'wallet' },
      { label: 'Severity', value: 'severity' },
      { label: 'Risk Level', value: 'riskLevel' },
      { label: 'Status', value: 'status' },
      { label: 'Reason', value: 'reason' },
      { label: 'Evidence Hashes', value: 'evidenceHashes' },
      { label: 'City', value: 'city' },
      { label: 'Org', value: 'org' },
      { label: 'Escalation Trail', value: 'escalationTrail' },
      { label: 'Created At', value: 'createdAt' }
    ];

    const parser = new Parser({ fields });
    const csv = parser.parse(cleanedReports);

    res.header('Content-Type', 'text/csv');
    res.attachment(`fraud_reports_${Date.now()}.csv`);
    return res.status(200).send(csv);
  } catch (err) {
    console.error('❌ Export error:', err);
    res.status(500).json({ error: 'Failed to export reports' });
  }
});

// ✅ Export evidence + metadata for a given case
router.get('/case/:caseId', authMiddleware, adminOnly, exportCaseFiles);

// ✅ Serve exported files (download by filename)
router.get('/file/:filename', authMiddleware, adminOnly, getExportedFile);

module.exports = router;
