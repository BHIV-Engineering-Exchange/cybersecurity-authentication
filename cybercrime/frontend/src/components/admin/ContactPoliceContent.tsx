import { Phone, Mail, MapPin, Send, Clock, CheckCircle, Shield, FileText, AlertTriangle, Lock, Bot, Tag, ChevronRight, Search } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { useState } from "react";

interface PoliceStation {
  name: string;
  zone: string;
  designation: string;
  mobile: string;
  email: string;
  telephone: string;
  location: string;
  specialization: string;
}

export function ContactPoliceContent() {
  const [currentStep, setCurrentStep] = useState(1);
  const [walletId, setWalletId] = useState("");
  const [selectedStation, setSelectedStation] = useState<PoliceStation | null>(null);
  const [formData, setFormData] = useState({
    description: "",
    internalNotes: "",
  });

  // Mock case data that appears after wallet ID is entered
  const caseData = {
    walletId: "21315521561546454+",
    caseId: "CASE-678",
    riskScore: 85,
    investigator: "Detective Smith",
    region: "New York",
    status: "High Risk",
    mlTags: ["HIGH", "IsolationForest"],
    aiAnalysis: {
      riskLevel: "HIGH",
      fraudProbability: "85%",
      model: "IsolationForest",
      suspicious: "YES",
    },
    evidenceFiles: [
      {
        name: "transaction_log_analysis.pdf",
        size: "2.3 MB",
        uploadedBy: "Detective Smith",
      },
      {
        name: "wallet_activity_export.csv",
        size: "1.8 MB",
        uploadedBy: "Officer Johnson",
      },
    ],
  };

  const policeStations: PoliceStation[] = [
    {
      name: "Gorakhpur Range",
      zone: "Gorakhpur Range",
      designation: "DIG",
      mobile: "94544002",
      email: "digrgkr@up.gov.in",
      telephone: "0551-2201, 0551-2200",
      location: "Gorakhpur, Uttar Pradesh",
      specialization: "General Law Enforcement",
    },
    {
      name: "Mumbai Cyber Cell",
      zone: "Mumbai Metropolitan",
      designation: "ACP",
      mobile: "98765432",
      email: "cybermumbai@gov.in",
      telephone: "022-2345, 022-2346",
      location: "Mumbai, Maharashtra",
      specialization: "Cybercrime & Digital Forensics",
    },
    {
      name: "Delhi Central District",
      zone: "Delhi Central",
      designation: "DCP",
      mobile: "91234567",
      email: "delhicentral@police.gov.in",
      telephone: "011-2301, 011-2302",
      location: "New Delhi, Delhi",
      specialization: "Financial Crimes & Fraud",
    },
  ];

  const recentReports = [
    {
      walletId: "0x742d35Cc6634C0532925a3b8D",
      caseId: "CASE-675",
      station: "Gorakhpur Range",
      sentBy: "Detective Smith",
      sentAt: "2 hours ago",
      status: "Acknowledged",
    },
    {
      walletId: "0x8f7A1B2C3D4E5F6A7B8C9D0E1F",
      caseId: "CASE-673",
      station: "Mumbai Cyber Cell",
      sentBy: "Agent Johnson",
      sentAt: "5 hours ago",
      status: "In Progress",
    },
    {
      walletId: "0x9cA8e8F8c1C0F8f8F8F8F8F8F",
      caseId: "CASE-670",
      station: "Delhi Central District",
      sentBy: "Inspector Lee",
      sentAt: "1 day ago",
      status: "Completed",
    },
  ];

  const handleWalletSubmit = () => {
    if (walletId.trim()) {
      setCurrentStep(2);
    }
  };

  const handleStationSelect = (station: PoliceStation) => {
    setSelectedStation(station);
    setCurrentStep(4);
  };

  const handleSendReport = () => {
    // In real app, this would send the report
    alert("Report sent securely to " + selectedStation?.name);
    // Reset to step 1
    setCurrentStep(1);
    setWalletId("");
    setSelectedStation(null);
    setFormData({ description: "", internalNotes: "" });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent mb-2">
          Contact Police
        </h1>
        <p className="text-gray-500 font-mono text-sm">Secure Law Enforcement Reporting System</p>
      </div>

      {/* Progress Steps */}
      <div className="bg-gradient-to-br from-gray-900/80 to-black/80 backdrop-blur-xl border border-emerald-500/20 rounded-lg p-6">
        <div className="flex items-center justify-between">
          {[
            { num: 1, label: "Enter Wallet ID" },
            { num: 2, label: "Evidence Auto-Attach" },
            { num: 3, label: "Police Station" },
            { num: 4, label: "Secure Report" },
          ].map((step, index) => (
            <div key={step.num} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-1">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-mono transition-all ${
                    currentStep >= step.num
                      ? "bg-gradient-to-r from-emerald-600 to-cyan-600 text-white border-2 border-emerald-400"
                      : "bg-gray-800 text-gray-500 border-2 border-gray-700"
                  }`}
                >
                  {currentStep > step.num ? <CheckCircle className="w-5 h-5" /> : step.num}
                </div>
                <span
                  className={`text-xs font-mono mt-2 text-center ${
                    currentStep >= step.num ? "text-emerald-400" : "text-gray-600"
                  }`}
                >
                  {step.label}
                </span>
              </div>
              {index < 3 && (
                <div
                  className={`h-0.5 w-full mb-6 transition-all ${
                    currentStep > step.num ? "bg-gradient-to-r from-emerald-600 to-cyan-600" : "bg-gray-800"
                  }`}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Step 1: Enter Wallet ID */}
      {currentStep === 1 && (
        <div className="bg-gradient-to-br from-gray-900/80 to-black/80 backdrop-blur-xl border border-emerald-500/20 rounded-lg p-6">
          <h2 className="text-emerald-400 font-mono mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Step 1: Enter Wallet ID
          </h2>
          <div className="space-y-4">
            <div>
              <label className="text-gray-400 text-sm font-mono mb-2 block">Wallet ID / Address *</label>
              <Input
                placeholder="Enter wallet address or ID..."
                value={walletId}
                onChange={(e) => setWalletId(e.target.value)}
                className="bg-black/60 border-emerald-500/40 text-gray-100 font-mono focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20"
              />
            </div>
            <Button
              onClick={handleWalletSubmit}
              disabled={!walletId.trim()}
              className="bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 font-mono disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Continue
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 2: Evidence Auto-Attached */}
      {currentStep === 2 && (
        <div className="space-y-4">
          <div className="bg-gradient-to-br from-gray-900/80 to-black/80 backdrop-blur-xl border border-cyan-500/20 rounded-lg p-6">
            <h2 className="text-cyan-400 font-mono mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Step 2: Evidence Auto-Attached
            </h2>

            {/* Case Details */}
            <div className="bg-black/40 border border-cyan-500/20 rounded-lg p-5 mb-4">
              <h3 className="text-cyan-400 font-mono text-sm mb-4">Case Details</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-gray-500 text-xs font-mono mb-1">Wallet ID:</p>
                  <p className="text-gray-300 font-mono text-sm">{caseData.walletId}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs font-mono mb-1">Case ID:</p>
                  <p className="text-cyan-400 font-mono text-sm">{caseData.caseId}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs font-mono mb-1">Risk Score:</p>
                  <p className="text-red-400 font-mono text-sm">{caseData.riskScore}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs font-mono mb-1">Investigator:</p>
                  <p className="text-gray-300 font-mono text-sm">{caseData.investigator}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs font-mono mb-1">Region:</p>
                  <p className="text-gray-300 font-mono text-sm">{caseData.region}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs font-mono mb-1">Status:</p>
                  <p className="text-orange-400 font-mono text-sm">{caseData.status}</p>
                </div>
              </div>

              {/* ML Tags */}
              <div className="mt-4 pt-4 border-t border-cyan-500/10">
                <div className="flex items-center gap-2 mb-2">
                  <Tag className="w-4 h-4 text-purple-400" />
                  <span className="text-purple-400 font-mono text-sm">ML Tags:</span>
                </div>
                <div className="flex gap-2">
                  {caseData.mlTags.map((tag, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-red-950/40 border border-red-500/30 rounded-full text-red-300 font-mono text-xs"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* AI Analysis Results */}
            <div className="bg-black/40 border border-purple-500/20 rounded-lg p-5 mb-4">
              <h3 className="text-purple-400 font-mono text-sm mb-4 flex items-center gap-2">
                <Bot className="w-4 h-4" />
                🤖 AI Analysis Results
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-gray-500 text-xs font-mono mb-1">Risk Level:</p>
                  <p className="text-red-400 font-mono">{caseData.aiAnalysis.riskLevel}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs font-mono mb-1">Fraud Probability:</p>
                  <p className="text-orange-400 font-mono">{caseData.aiAnalysis.fraudProbability}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs font-mono mb-1">Model:</p>
                  <p className="text-cyan-400 font-mono text-sm">{caseData.aiAnalysis.model}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs font-mono mb-1">Suspicious:</p>
                  <p className="text-red-400 font-mono">{caseData.aiAnalysis.suspicious}</p>
                </div>
              </div>
            </div>

            {/* Linked Evidence Files */}
            <div className="bg-black/40 border border-emerald-500/20 rounded-lg p-5">
              <h3 className="text-emerald-400 font-mono text-sm mb-2 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                📎 Linked Evidence Files (Auto-Attached)
              </h3>
              <p className="text-gray-500 text-xs font-mono mb-4">
                Found {caseData.evidenceFiles.length} files for wallet {caseData.walletId}
              </p>
              <div className="space-y-3">
                {caseData.evidenceFiles.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-4 bg-black/60 border border-emerald-500/20 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-emerald-400" />
                      <div>
                        <p className="text-gray-300 font-mono text-sm">{file.name}</p>
                        <p className="text-gray-500 text-xs font-mono mt-1">
                          {file.size} • Uploaded by {file.uploadedBy}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Lock className="w-4 h-4 text-orange-400" />
                      <span className="text-orange-400 text-xs font-mono">Read-Only</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 p-3 bg-orange-950/20 border border-orange-500/20 rounded-lg">
                <p className="text-orange-400/80 text-xs font-mono flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>
                    All evidence files are automatically attached and cannot be removed to preserve chain of custody.
                  </span>
                </p>
              </div>
            </div>

            <Button
              onClick={() => setCurrentStep(3)}
              className="mt-4 bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 font-mono"
            >
              Continue to Police Station Selection
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Police Station Selection */}
      {currentStep === 3 && (
        <div className="bg-gradient-to-br from-gray-900/80 to-black/80 backdrop-blur-xl border border-emerald-500/20 rounded-lg p-6">
          <h2 className="text-emerald-400 font-mono mb-4 flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Step 3: Police Station Selection
          </h2>

          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <Input
              placeholder="Search by location, zone, or specialization..."
              className="pl-10 bg-black/60 border-emerald-500/40 text-gray-100 font-mono focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20"
            />
          </div>

          <div className="space-y-3">
            {policeStations.map((station, index) => (
              <div
                key={index}
                className={`p-5 rounded-lg border-2 transition-all cursor-pointer ${
                  selectedStation?.name === station.name
                    ? "bg-emerald-950/40 border-emerald-500/60"
                    : "bg-black/40 border-emerald-500/20 hover:border-emerald-500/40"
                }`}
                onClick={() => handleStationSelect(station)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-emerald-400 font-mono mb-1">{station.name}</h3>
                    {selectedStation?.name === station.name && (
                      <span className="text-xs font-mono text-cyan-400 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" />
                        Selected Station
                      </span>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-gray-500 text-xs font-mono">Zone/Range/District:</p>
                    <p className="text-gray-300 font-mono">{station.zone}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs font-mono">Designation:</p>
                    <p className="text-gray-300 font-mono">{station.designation}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs font-mono">Mobile No.:</p>
                    <p className="text-cyan-400 font-mono">{station.mobile}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs font-mono">E-Mail:</p>
                    <p className="text-cyan-400 font-mono">{station.email}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs font-mono">Telephone:</p>
                    <p className="text-gray-300 font-mono">{station.telephone}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs font-mono">Location:</p>
                    <p className="text-gray-300 font-mono">{station.location}</p>
                  </div>
                  <div className="md:col-span-2">
                    <p className="text-gray-500 text-xs font-mono">Specialization:</p>
                    <p className="text-purple-400 font-mono">{station.specialization}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Step 4: Secure Report Form */}
      {currentStep === 4 && selectedStation && (
        <div className="bg-gradient-to-br from-gray-900/80 to-black/80 backdrop-blur-xl border border-emerald-500/20 rounded-lg p-6">
          <h2 className="text-emerald-400 font-mono mb-4 flex items-center gap-2">
            <Send className="w-5 h-5" />
            Step 4: Secure Report Form
          </h2>

          {/* Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 p-4 bg-black/40 border border-cyan-500/20 rounded-lg">
            <div>
              <p className="text-gray-500 text-xs font-mono mb-1">Wallet ID</p>
              <p className="text-gray-300 font-mono text-sm">{caseData.walletId}</p>
            </div>
            <div>
              <p className="text-gray-500 text-xs font-mono mb-1">Case ID</p>
              <p className="text-cyan-400 font-mono text-sm">{caseData.caseId}</p>
            </div>
            <div>
              <p className="text-gray-500 text-xs font-mono mb-1">Risk Score</p>
              <p className="text-red-400 font-mono text-sm">{caseData.riskScore}</p>
            </div>
            <div>
              <p className="text-gray-500 text-xs font-mono mb-1">Evidence Count</p>
              <p className="text-emerald-400 font-mono text-sm">{caseData.evidenceFiles.length} files</p>
            </div>
          </div>

          {/* Selected Station Info */}
          <div className="mb-6 p-4 bg-emerald-950/20 border border-emerald-500/30 rounded-lg">
            <p className="text-emerald-400 text-xs font-mono mb-2">Sending Report To:</p>
            <p className="text-gray-100 font-mono">{selectedStation.name}</p>
            <p className="text-gray-400 text-xs font-mono mt-1">{selectedStation.location}</p>
          </div>

          {/* Form */}
          <div className="space-y-4">
            <div>
              <label className="text-gray-400 text-sm font-mono mb-2 block">
                Description of Incident <span className="text-red-400">*</span>
              </label>
              <Textarea
                placeholder="Provide a detailed summary of the incident, suspicious activities, and any relevant information for law enforcement..."
                rows={6}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="bg-black/60 border-emerald-500/40 text-gray-100 font-mono resize-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20"
              />
            </div>
            <div>
              <label className="text-gray-400 text-sm font-mono mb-2 block">Internal Notes (Optional)</label>
              <Textarea
                placeholder="Add internal notes, investigation context, or additional information for your records..."
                rows={4}
                value={formData.internalNotes}
                onChange={(e) => setFormData({ ...formData, internalNotes: e.target.value })}
                className="bg-black/60 border-emerald-500/40 text-gray-100 font-mono resize-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20"
              />
            </div>

            <div className="flex gap-3">
              <Button
                onClick={() => setCurrentStep(3)}
                variant="outline"
                className="border-gray-600 text-gray-400 hover:bg-gray-800 font-mono"
              >
                Back
              </Button>
              <Button
                onClick={handleSendReport}
                disabled={!formData.description.trim()}
                className="flex-1 bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 font-mono disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-500/20"
              >
                <Send className="w-4 h-4 mr-2" />
                Send Securely
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* History of Recent Reports */}
      <div className="bg-gradient-to-br from-gray-900/80 to-black/80 backdrop-blur-xl border border-cyan-500/20 rounded-lg p-6">
        <h2 className="text-cyan-400 font-mono mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5" />
          History of Recent Reports
        </h2>
        <div className="space-y-3">
          {recentReports.map((report, index) => (
            <div
              key={index}
              className="p-4 bg-black/40 border border-cyan-500/10 rounded-lg hover:border-cyan-500/30 transition-all"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <span className="text-cyan-400 font-mono text-sm">{report.caseId}</span>
                  <span className="text-gray-600">•</span>
                  <span className="text-gray-400 font-mono text-sm">{report.walletId}</span>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-mono ${
                    report.status === "Completed"
                      ? "bg-emerald-950/40 border border-emerald-500/30 text-emerald-400"
                      : report.status === "In Progress"
                      ? "bg-orange-950/40 border border-orange-500/30 text-orange-400"
                      : "bg-cyan-950/40 border border-cyan-500/30 text-cyan-400"
                  }`}
                >
                  {report.status}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs text-gray-500">
                <div className="flex items-center gap-2">
                  <MapPin className="w-3 h-3 text-emerald-400" />
                  <span className="font-mono">{report.station}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span>Sent by {report.sentBy}</span>
                  <span>•</span>
                  <span className="font-mono">{report.sentAt}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
