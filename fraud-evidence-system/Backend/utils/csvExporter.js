const fs = require('fs');
const { Parser } = require('json2csv');

exports.exportToCSV = (data, filePath) => {
  if (!Array.isArray(data)) return;
  const fields = ['_id', 'wallet', 'reason', 'severity', 'createdAt'];
  const opts = { fields };

  try {
    const parser = new Parser(opts);
    const csv = parser.parse(data);
    fs.writeFileSync(filePath, csv);
  } catch (err) {
    console.error('CSV Export Error:', err);
  }
};
