import { FileText, Download, Filter, AlertCircle, CheckCircle, Info, AlertTriangle } from "lucide-react";
import { Button } from "../ui/button";

export function SystemLogsContent() {
  const logs = [
    { timestamp: "2024-11-18 14:32:45", level: "Info", user: "Agent_047", action: "Case created", details: "Created case CYB-2024-015" },
    { timestamp: "2024-11-18 14:30:12", level: "Warning", user: "System", action: "Login attempt", details: "Multiple failed login attempts from IP 192.168.1.105" },
    { timestamp: "2024-11-18 14:28:33", level: "Success", user: "Investigator_12", action: "Evidence uploaded", details: "Uploaded file: network_capture.pcap" },
    { timestamp: "2024-11-18 14:25:18", level: "Error", user: "System", action: "Database query", details: "Query timeout on evidence table" },
    { timestamp: "2024-11-18 14:22:04", level: "Info", user: "Agent_091", action: "Report generated", details: "Monthly analytics report created" },
    { timestamp: "2024-11-18 14:19:47", level: "Success", user: "Admin_03", action: "User created", details: "New investigator account: Agent_155" },
    { timestamp: "2024-11-18 14:15:22", level: "Warning", user: "System", action: "Storage alert", details: "Evidence storage at 87% capacity" },
    { timestamp: "2024-11-18 14:12:08", level: "Info", user: "Agent_023", action: "Case updated", details: "Status changed to Closed for CYB-2024-003" },
  ];

  const getLevelIcon = (level: string) => {
    switch (level) {
      case "Error": return AlertCircle;
      case "Warning": return AlertTriangle;
      case "Success": return CheckCircle;
      default: return Info;
    }
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case "Error": return "red";
      case "Warning": return "yellow";
      case "Success": return "emerald";
      default: return "cyan";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent mb-2">
            System Logs
          </h1>
          <p className="text-gray-500 font-mono text-sm">Audit Trail & Activity Monitor</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10 font-mono">
            <Filter className="w-4 h-4 mr-2" />
            Filter
          </Button>
          <Button className="bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 font-mono">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: "Total Logs", value: "24,573", color: "cyan" },
          { label: "Errors", value: "12", color: "red" },
          { label: "Warnings", value: "47", color: "yellow" },
          { label: "Success", value: "24,514", color: "emerald" },
        ].map((stat, index) => (
          <div key={index} className="bg-gradient-to-br from-gray-900/80 to-black/80 backdrop-blur-xl border border-emerald-500/20 rounded-lg p-4">
            <div className="text-2xl text-gray-100 mb-1">{stat.value}</div>
            <div className={`text-sm text-${stat.color}-400 font-mono`}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Logs Table */}
      <div className="bg-gradient-to-br from-gray-900/80 to-black/80 backdrop-blur-xl border border-emerald-500/20 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-emerald-500/20 bg-black/40">
                <th className="text-left p-4 text-emerald-400 font-mono text-sm">Timestamp</th>
                <th className="text-left p-4 text-emerald-400 font-mono text-sm">Level</th>
                <th className="text-left p-4 text-emerald-400 font-mono text-sm">User</th>
                <th className="text-left p-4 text-emerald-400 font-mono text-sm">Action</th>
                <th className="text-left p-4 text-emerald-400 font-mono text-sm">Details</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log, index) => {
                const LevelIcon = getLevelIcon(log.level);
                const color = getLevelColor(log.level);
                return (
                  <tr key={index} className="border-b border-emerald-500/10 hover:bg-emerald-500/5 transition font-mono text-sm">
                    <td className="p-4 text-gray-500">{log.timestamp}</td>
                    <td className="p-4">
                      <span className={`flex items-center gap-2 px-2 py-1 bg-${color}-950/40 border border-${color}-500/30 rounded text-${color}-400 w-fit`}>
                        <LevelIcon className="w-3 h-3" />
                        {log.level}
                      </span>
                    </td>
                    <td className="p-4 text-cyan-400">{log.user}</td>
                    <td className="p-4 text-gray-300">{log.action}</td>
                    <td className="p-4 text-gray-500">{log.details}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
