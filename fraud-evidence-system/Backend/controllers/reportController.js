//controllers/reportController.js
const fs = require('fs');
const path = require('path');
const Report = require('../models/Report');
const { sendMessage } = require('../utils/producer');
const { exportToCSV } = require('../utils/csvExporter');
const geoip = require('geoip-lite'); // ✅ GeoIP for tagging

// ✅ Submit Report Endpoint (generic entity, not Ethereum)
exports.submitReport = async (req, res) => {
  try {
    const { entityId, reason, severity } = req.body;

    const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress;
    const geo = geoip.lookup(ip);

    const ipGeo = geo
      ? {
          lat: geo.ll[0],
          lon: geo.ll[1],
          city: geo.city || 'Unknown',
          org: geo.org || 'Unknown',
        }
      : null;

    const report = new Report({ entityId, reason, severity, ipGeo });
    await report.save();

    // ✅ Publish to Kafka
    await sendMessage('fraud-reports', {
      entityId: report.entityId,
      reason: report.reason,
      severity: report.severity,
      reportId: report._id,
      createdAt: report.createdAt,
    });

    // ✅ Dump JSON + CSV
    const reportId = report._id.toString();
    const allReportsForId = await Report.find({ _id: reportId });

    const dumpsDir = path.join(__dirname, '..', 'dumps');
    if (!fs.existsSync(dumpsDir)) fs.mkdirSync(dumpsDir);

    fs.writeFileSync(
      path.join(dumpsDir, `${reportId}.json`),
      JSON.stringify(allReportsForId, null, 2)
    );

    exportToCSV(allReportsForId, path.join(dumpsDir, `${reportId}.csv`));

    res.status(201).json({ message: 'Report submitted and dumped', report });
  } catch (err) {
    console.error('Submit Report Error:', err);
    res.status(500).json({ error: 'Failed to submit report' });
  }
};

// ✅ Fetch All Reports
exports.getReports = async (req, res) => {
  try {
    const reports = await Report.find();
    res.json(reports);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
};

// ✅ Get Risk Level for Entity
exports.getEntityRisk = async (req, res) => {
  const { entityId } = req.params;
  try {
    const reports = await Report.find({ entityId });
    let riskLevel = 'low';
    if (reports.length > 5) {
      riskLevel = 'high';
    } else if (reports.length > 2) {
      riskLevel = 'medium';
    }
    res.json({ entityId, riskLevel });
  } catch (err) {
    res.status(500).json({ error: 'Failed to assess risk' });
  }
};
