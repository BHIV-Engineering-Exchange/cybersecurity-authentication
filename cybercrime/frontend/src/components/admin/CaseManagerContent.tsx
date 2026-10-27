import { FolderOpen, Search, Filter, Plus, Eye, Edit, Trash2 } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";

export function CaseManagerContent() {
  const cases = [
    { id: "CYB-2024-001", title: "Phishing Campaign Investigation", status: "Active", priority: "High", assigned: "Agent_047", date: "2024-11-15" },
    { id: "CYB-2024-002", title: "Ransomware Attack Analysis", status: "Active", priority: "Critical", assigned: "Agent_091", date: "2024-11-16" },
    { id: "CYB-2024-003", title: "Data Breach Response", status: "Pending", priority: "High", assigned: "Investigator_12", date: "2024-11-17" },
    { id: "CYB-2024-004", title: "Social Engineering Case", status: "Closed", priority: "Medium", assigned: "Agent_023", date: "2024-11-10" },
    { id: "CYB-2024-005", title: "Cryptocurrency Fraud", status: "Active", priority: "High", assigned: "Agent_047", date: "2024-11-18" },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Active": return "emerald";
      case "Pending": return "yellow";
      case "Closed": return "gray";
      default: return "gray";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "Critical": return "red";
      case "High": return "orange";
      case "Medium": return "cyan";
      default: return "gray";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent mb-2">
            Case Manager
          </h1>
          <p className="text-gray-500 font-mono text-sm">Active Cybercrime Investigations</p>
        </div>
        <Button className="bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 font-mono">
          <Plus className="w-4 h-4 mr-2" />
          New Case
        </Button>
      </div>

      {/* Search & Filter */}
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <Input
            placeholder="Search cases..."
            className="pl-10 bg-black/60 border-emerald-500/40 text-gray-100 font-mono"
          />
        </div>
        <Button variant="outline" className="border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10 font-mono">
          <Filter className="w-4 h-4 mr-2" />
          Filters
        </Button>
      </div>

      {/* Cases Table */}
      <div className="bg-gradient-to-br from-gray-900/80 to-black/80 backdrop-blur-xl border border-emerald-500/20 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-emerald-500/20 bg-black/40">
                <th className="text-left p-4 text-emerald-400 font-mono text-sm">Case ID</th>
                <th className="text-left p-4 text-emerald-400 font-mono text-sm">Title</th>
                <th className="text-left p-4 text-emerald-400 font-mono text-sm">Status</th>
                <th className="text-left p-4 text-emerald-400 font-mono text-sm">Priority</th>
                <th className="text-left p-4 text-emerald-400 font-mono text-sm">Assigned To</th>
                <th className="text-left p-4 text-emerald-400 font-mono text-sm">Date</th>
                <th className="text-left p-4 text-emerald-400 font-mono text-sm">Actions</th>
              </tr>
            </thead>
            <tbody>
              {cases.map((caseItem, index) => (
                <tr key={index} className="border-b border-emerald-500/10 hover:bg-emerald-500/5 transition">
                  <td className="p-4 font-mono text-sm text-cyan-400">{caseItem.id}</td>
                  <td className="p-4 text-gray-300">{caseItem.title}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 text-xs font-mono bg-${getStatusColor(caseItem.status)}-950/40 border border-${getStatusColor(caseItem.status)}-500/30 rounded text-${getStatusColor(caseItem.status)}-400`}>
                      {caseItem.status}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-1 text-xs font-mono bg-${getPriorityColor(caseItem.priority)}-950/40 border border-${getPriorityColor(caseItem.priority)}-500/30 rounded text-${getPriorityColor(caseItem.priority)}-400`}>
                      {caseItem.priority}
                    </span>
                  </td>
                  <td className="p-4 font-mono text-sm text-gray-400">{caseItem.assigned}</td>
                  <td className="p-4 font-mono text-sm text-gray-500">{caseItem.date}</td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <button className="p-1 hover:bg-emerald-500/20 rounded transition">
                        <Eye className="w-4 h-4 text-gray-500 hover:text-emerald-400" />
                      </button>
                      <button className="p-1 hover:bg-cyan-500/20 rounded transition">
                        <Edit className="w-4 h-4 text-gray-500 hover:text-cyan-400" />
                      </button>
                      <button className="p-1 hover:bg-red-500/20 rounded transition">
                        <Trash2 className="w-4 h-4 text-gray-500 hover:text-red-400" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
