//controllers/exportController.js
const fs = require("fs");
const path = require("path");
const Report = require("../models/Report");
const Evidence = require("../models/Evidence");
const { Parser } = require("json2csv");

// 🔁 Base path to store exported files
const EXPORT_DIR = path.join(__dirname, "..", "exports");
if (!fs.existsSync(EXPORT_DIR)) fs.mkdirSync(EXPORT_DIR);

// ✅ 1. Export all reports from Report model (raw JSON)
exports.exportReports = async (req, res) => {
  try {
    const reports = await Report.find().lean();

    const formatted = reports.map((r) => ({
      wallet: r.wallet,
      risk: r.risk || r.riskLevel,
      evidenceHashes: r.evidenceHashes || [],
      ipGeo: r.ipGeo || {},
      escalationLog: r.escalationLog || [],
    }));

    res.status(200).json(formatted);
  } catch (err) {
    console.error("Export Error:", err);
    res.status(500).json({ error: "Failed to export reports" });
  }
};

// ✅ 2. Export evidence per caseId → save JSON + CSV
exports.exportCaseFiles = async (req, res) => {
  const { caseId } = req.params;

  try {
    const records = await Evidence.find({ caseId }).lean();

    if (!records.length) {
      return res.status(404).json({ error: "No records found for this case ID." });
    }

    // Save JSON
    const jsonPath = path.join(EXPORT_DIR, `case-${caseId}.json`);
    fs.writeFileSync(jsonPath, JSON.stringify(records, null, 2));

    // Save CSV
    const fields = ["caseId", "entity", "filename", "riskLevel", "uploadedAt"];
    const parser = new Parser({ fields });
    const csv = parser.parse(records);
    const csvPath = path.join(EXPORT_DIR, `case-${caseId}.csv`);
    fs.writeFileSync(csvPath, csv);

    return res.status(200).json({
      message: "Export completed",
      files: {
        json: `/api/reports/export/file/case-${caseId}.json`,
        csv: `/api/reports/export/file/case-${caseId}.csv`,
      },
    });
  } catch (err) {
    console.error("Export failed:", err);
    res.status(500).json({ error: "Internal error while exporting." });
  }
};

// ✅ 3. Serve generated JSON/CSV file
exports.getExportedFile = (req, res) => {
  const fileName = req.params.filename;
  const filePath = path.join(EXPORT_DIR, fileName);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: "File not found." });
  }

  return res.download(filePath);
};
