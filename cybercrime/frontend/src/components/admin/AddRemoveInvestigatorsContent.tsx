import { UserPlus, Users, Trash2, Mail, Shield, Search } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";

export function AddRemoveInvestigatorsContent() {
  const investigators = [
    { id: "USR-047", name: "Sarah Chen", role: "Senior Agent", email: "sarah.chen@cyber.gov", status: "Active", cases: 12 },
    { id: "USR-091", name: "Marcus Rodriguez", role: "Lead Investigator", email: "marcus.r@cyber.gov", status: "Active", cases: 8 },
    { id: "USR-012", name: "Emily Watson", role: "Investigator", email: "e.watson@cyber.gov", status: "Active", cases: 15 },
    { id: "USR-023", name: "David Kim", role: "Agent", email: "david.kim@cyber.gov", status: "Inactive", cases: 0 },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent mb-2">
            Add / Remove Investigators
          </h1>
          <p className="text-gray-500 font-mono text-sm">User Account Management</p>
        </div>
        <Button className="bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 font-mono">
          <UserPlus className="w-4 h-4 mr-2" />
          Add Investigator
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        <Input
          placeholder="Search investigators by name, email, or ID..."
          className="pl-10 bg-black/60 border-emerald-500/40 text-gray-100 font-mono"
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: "Total Investigators", value: "64", icon: Users },
          { label: "Active", value: "58", icon: Shield },
          { label: "Inactive", value: "6", icon: Users },
          { label: "Pending Approval", value: "3", icon: UserPlus },
        ].map((stat, index) => (
          <div key={index} className="bg-gradient-to-br from-gray-900/80 to-black/80 backdrop-blur-xl border border-emerald-500/20 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <stat.icon className="w-8 h-8 text-cyan-400" />
              <div>
                <div className="text-2xl text-gray-100">{stat.value}</div>
                <div className="text-xs text-gray-500 font-mono">{stat.label}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Investigators List */}
      <div className="bg-gradient-to-br from-gray-900/80 to-black/80 backdrop-blur-xl border border-emerald-500/20 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-emerald-500/20 bg-black/40">
                <th className="text-left p-4 text-emerald-400 font-mono text-sm">User ID</th>
                <th className="text-left p-4 text-emerald-400 font-mono text-sm">Name</th>
                <th className="text-left p-4 text-emerald-400 font-mono text-sm">Role</th>
                <th className="text-left p-4 text-emerald-400 font-mono text-sm">Email</th>
                <th className="text-left p-4 text-emerald-400 font-mono text-sm">Status</th>
                <th className="text-left p-4 text-emerald-400 font-mono text-sm">Active Cases</th>
                <th className="text-left p-4 text-emerald-400 font-mono text-sm">Actions</th>
              </tr>
            </thead>
            <tbody>
              {investigators.map((investigator, index) => (
                <tr key={index} className="border-b border-emerald-500/10 hover:bg-emerald-500/5 transition">
                  <td className="p-4 font-mono text-sm text-cyan-400">{investigator.id}</td>
                  <td className="p-4 text-gray-300">{investigator.name}</td>
                  <td className="p-4 text-gray-400 text-sm">{investigator.role}</td>
                  <td className="p-4 font-mono text-sm text-gray-500">
                    <div className="flex items-center gap-2">
                      <Mail className="w-3 h-3 text-cyan-400" />
                      {investigator.email}
                    </div>
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-1 text-xs font-mono ${investigator.status === 'Active' ? 'bg-emerald-950/40 border border-emerald-500/30 text-emerald-400' : 'bg-gray-800/40 border border-gray-600/30 text-gray-400'} rounded`}>
                      {investigator.status}
                    </span>
                  </td>
                  <td className="p-4 font-mono text-sm text-gray-400 text-center">{investigator.cases}</td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" className="border-cyan-500/40 text-cyan-400 hover:bg-cyan-500/10 text-xs font-mono">
                        Edit
                      </Button>
                      <Button size="sm" variant="outline" className="border-red-500/40 text-red-400 hover:bg-red-500/10">
                        <Trash2 className="w-3 h-3" />
                      </Button>
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
