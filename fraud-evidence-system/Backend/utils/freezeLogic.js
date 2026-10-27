const Report = require("../models/Report");

exports.shouldFreezeWallet = async (wallet) => {
  const highRiskReports = await Report.countDocuments({
    wallet,
    risk: "high",
    status: { $ne: "false-positive" },
  });

  // Freeze wallet if ≥2 high-risk reports (customize as needed)
  return highRiskReports >= 2;
};
