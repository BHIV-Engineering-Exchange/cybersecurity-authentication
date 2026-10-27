//routes/reportRoutes.js
const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const Report = require('../models/Report');
const AuditLog = require('../models/AuditLog');
const { sendEmailAlert } = require('../utils/emailAlert');
const { alertServices } = require('../utils/alertService');
const { sendMessage } = require('../utils/producer');
const { exportToCSV } = require('../utils/csvExporter');
const isAdmin = require('../middleware/adminOnly');

const dumpsDir = path.join(__dirname, '..', 'dumps');
if (!fs.existsSync(dumpsDir)) fs.mkdirSync(dumpsDir);

const dumpReportToDisk = async (reportId) => {
  try {
    const allReports = await Report.find({ _id: reportId });

    const jsonPath = path.join(dumpsDir, `${reportId}.json`);
    fs.writeFileSync(jsonPath, JSON.stringify(allReports, null, 2));

    const csvPath = path.join(dumpsDir, `${reportId}.csv`);
    exportToCSV(allReports, csvPath);

    console.log(`🧾 Dumped report ${reportId} to disk`);
  } catch (err) {
    console.error(`❌ Failed to dump report ${reportId}:`, err);
  }
};

// ================== SUBMIT REPORT ==================
router.post('/', async (req, res) => {
  const payload = req.body;
  console.log('🚨 /api/reports HIT');
  console.log('📦 Payload:', JSON.stringify(payload));

  const userIdentity =
    req.user?.email || req.headers['x-forwarded-for'] || req.ip || 'unknown';

  try {
    if (Array.isArray(payload)) {
      console.log('📝 Inserting multiple reports...');
      const savedReports = await Report.insertMany(payload);
      console.log(`✅ Inserted ${savedReports.length} reports`);

      for (const report of savedReports) {
        (async () => {
          try {
            await sendMessage('fraud-reports', {
              wallet: report.wallet,
              reason: report.reason,
              severity: report.severity,
              reportId: report._id,
              createdAt: report.createdAt
            });

            await AuditLog.create({
              user: userIdentity,
              wallet: report.wallet,
              riskLevel: report.riskLevel || 'unknown'
            });

            if (report.severity >= 4) {
              await sendEmailAlert({
                to: process.env.ALERT_EMAIL,
                subject: 'High Severity Fraud Report',
                text: `High severity report submitted:\nWallet: ${report.wallet}\nReason: ${report.reason}`
              });
            }

            if (report.riskLevel === 'high') {
              await alertServices(report.wallet, report._id);
            }

            await dumpReportToDisk(report._id.toString());
          } catch (err) {
            console.error(`❌ Error in post-processing for report ${report._id}:`, err);
          }
        })();
      }

      res.status(201).json({
        message: 'Reports created successfully',
        reports: savedReports
      });
    } else {
      console.log('📝 Inserting single report...');
      const report = new Report(payload);
      await report.save();
      console.log(`✅ Report ${report._id} saved`);

      (async () => {
        try {
          await sendMessage('fraud-reports', {
            wallet: report.wallet,
            reason: report.reason,
            severity: report.severity,
            reportId: report._id,
            createdAt: report.createdAt
          });

          await AuditLog.create({
            user: userIdentity,
            wallet: report.wallet,
            riskLevel: report.riskLevel || 'unknown'
          });

          if (report.severity >= 4) {
            await sendEmailAlert({
              to: process.env.ALERT_EMAIL,
              subject: 'High Severity Fraud Report',
              text: `High severity report submitted:\nWallet: ${report.wallet}\nReason: ${report.reason}`
            });
          }

          if (report.riskLevel === 'high') {
            await alertServices(report.wallet, report._id);
          }

          await dumpReportToDisk(report._id.toString());
        } catch (err) {
          console.error(`❌ Error in post-processing for report ${report._id}:`, err);
        }
      })();

      res.status(201).json({
        message: 'Report created successfully',
        report
      });
    }
  } catch (error) {
    console.error('❌ Error creating report:', error);
    res.status(500).json({ error: 'Failed to create report' });
  }
});

// ================== FETCH USER REPORTS ==================
router.get('/', async (req, res) => {
  const { user_email } = req.query;
  console.log(`🧭 GET /api/reports for user_email=${user_email}`);

  if (!user_email) {
    return res.status(400).json({ error: 'Missing user_email query parameter' });
  }

  try {
    const reports = await Report.find({ user_email }).sort({ createdAt: -1 });
    res.json({ reports });
  } catch (err) {
    console.error('❌ Error fetching reports:', err);
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
});

// ================== AUDIT LOGS ==================
router.get('/audit-logs', async (req, res) => {
  console.log('🧭 GET /api/reports/audit-logs');
  try {
    const logs = await AuditLog.find().sort({ timestamp: -1 }).limit(100);
    res.json({ logs });
  } catch (err) {
    console.error('❌ Error fetching audit logs:', err);
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

// ================== DOWNLOAD DUMP FILE ==================
router.get('/download/:reportId', isAdmin, async (req, res) => {
  const { reportId } = req.params;
  const format = req.query.format || 'json';
  const filePath = path.join(dumpsDir, `${reportId}.${format}`);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: `Dump not found for reportId: ${reportId}` });
  }

  res.download(filePath, `${reportId}.${format}`, (err) => {
    if (err) {
      console.error('❌ Download error:', err);
      res.status(500).json({ error: 'Failed to download file' });
    }
  });
});

// ================== DUMP ALL REPORTS GROUPED BY WALLET ==================
router.get('/dump/by-wallet', isAdmin, async (req, res) => {
  try {
    const reports = await Report.find();
    const grouped = {};

    for (const report of reports) {
      const key = report.wallet;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(report);
    }

    const jsonPath = path.join(dumpsDir, `group-by-wallet.json`);
    fs.writeFileSync(jsonPath, JSON.stringify(grouped, null, 2));

    const flatList = Object.entries(grouped).flatMap(([wallet, reports]) =>
      reports.map(r => ({ ...r.toObject(), wallet }))
    );
    const csvPath = path.join(dumpsDir, `group-by-wallet.csv`);
    exportToCSV(flatList, csvPath);

    res.json({
      message: 'Group-by-wallet dumps created',
      files: ['group-by-wallet.json', 'group-by-wallet.csv']
    });
  } catch (err) {
    console.error('❌ Failed to dump by wallet:', err);
    res.status(500).json({ error: 'Failed to group by wallet' });
  }
});

// ================== DUMP BY SEVERITY ==================
router.get('/dump/severity/:level', isAdmin, async (req, res) => {
  const { level } = req.params;
  try {
    const severity = parseInt(level, 10);
    if (isNaN(severity)) {
      return res.status(400).json({ error: 'Invalid severity level' });
    }

    const reports = await Report.find({ severity });

    const jsonPath = path.join(dumpsDir, `severity-${severity}.json`);
    fs.writeFileSync(jsonPath, JSON.stringify(reports, null, 2));

    const csvPath = path.join(dumpsDir, `severity-${severity}.csv`);
    exportToCSV(reports, csvPath);

    res.json({
      message: `Severity ${severity} dump created`,
      files: [`severity-${severity}.json`, `severity-${severity}.csv`]
    });
  } catch (err) {
    console.error('❌ Failed to dump by severity:', err);
    res.status(500).json({ error: 'Failed to group by severity' });
  }
});

// ================== LIST AVAILABLE DUMP FILES ==================
router.get('/dumps', isAdmin, async (req, res) => {
  try {
    const files = fs.readdirSync(dumpsDir);
    res.json({
      message: 'Available dump files',
      files
    });
  } catch (err) {
    console.error('❌ Failed to read dump directory:', err);
    res.status(500).json({ error: 'Could not list dump files' });
  }
});

module.exports = router;
