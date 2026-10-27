import { KeyRound, Search, RefreshCw, Send, Clock } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";

export function ResetPasswordsContent() {
  const recentResets = [
    { user: "Agent_047", email: "sarah.chen@cyber.gov", requestedBy: "Admin_03", time: "2h ago", status: "Completed" },
    { user: "Agent_091", email: "marcus.r@cyber.gov", requestedBy: "Self", time: "5h ago", status: "Pending" },
    { user: "Investigator_12", email: "e.watson@cyber.gov", requestedBy: "Admin_01", time: "1d ago", status: "Completed" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent mb-2">
          Reset Passwords
        </h1>
        <p className="text-gray-500 font-mono text-sm">Password Management & Recovery</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Reset Form */}
        <div className="bg-gradient-to-br from-gray-900/80 to-black/80 backdrop-blur-xl border border-emerald-500/20 rounded-lg p-6">
          <h2 className="text-emerald-400 font-mono mb-4 flex items-center gap-2">
            <KeyRound className="w-5 h-5" />
            Reset User Password
          </h2>
          <form className="space-y-4">
            <div>
              <label className="text-gray-400 text-sm font-mono mb-2 block">User Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <Input
                  placeholder="Search by username or email..."
                  className="pl-10 bg-black/60 border-emerald-500/40 text-gray-100 font-mono"
                />
              </div>
            </div>

            <div className="p-4 bg-black/40 border border-emerald-500/10 rounded-lg">
              <div className="text-sm text-gray-400 mb-2">Selected User</div>
              <div className="text-gray-100 mb-1">Sarah Chen (Agent_047)</div>
              <div className="text-xs text-gray-500 font-mono">sarah.chen@cyber.gov</div>
            </div>

            <div>
              <label className="text-gray-400 text-sm font-mono mb-2 block">Reset Method</label>
              <select className="w-full px-3 py-2 bg-black/60 border border-emerald-500/40 rounded-md text-gray-100 font-mono text-sm focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 outline-none">
                <option>Send Reset Link via Email</option>
                <option>Generate Temporary Password</option>
                <option>Force Password Change on Next Login</option>
              </select>
            </div>

            <div className="p-3 bg-yellow-950/20 border border-yellow-500/30 rounded-lg">
              <p className="text-yellow-400 text-sm font-mono">
                ⚠ User will receive reset instructions via email
              </p>
            </div>

            <div className="flex gap-2">
              <Button className="flex-1 bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 font-mono">
                <Send className="w-4 h-4 mr-2" />
                Send Reset Link
              </Button>
              <Button variant="outline" className="border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10 font-mono">
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
          </form>
        </div>

        {/* Recent Resets & Bulk Actions */}
        <div className="space-y-6">
          {/* Bulk Actions */}
          <div className="bg-gradient-to-br from-gray-900/80 to-black/80 backdrop-blur-xl border border-emerald-500/20 rounded-lg p-6">
            <h2 className="text-emerald-400 font-mono mb-4">Bulk Password Reset</h2>
            <div className="space-y-4">
              <p className="text-gray-400 text-sm">
                Force password reset for multiple users or entire departments
              </p>
              <div>
                <label className="text-gray-400 text-sm font-mono mb-2 block">Target Group</label>
                <select className="w-full px-3 py-2 bg-black/60 border border-emerald-500/40 rounded-md text-gray-100 font-mono text-sm focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 outline-none">
                  <option>All Investigators</option>
                  <option>Field Agents</option>
                  <option>Administrative Staff</option>
                  <option>Inactive Users (30+ days)</option>
                </select>
              </div>
              <Button variant="outline" className="w-full border-orange-500/40 text-orange-400 hover:bg-orange-500/10 font-mono">
                <RefreshCw className="w-4 h-4 mr-2" />
                Bulk Reset
              </Button>
            </div>
          </div>

          {/* Recent Resets */}
          <div className="bg-gradient-to-br from-gray-900/80 to-black/80 backdrop-blur-xl border border-emerald-500/20 rounded-lg p-6">
            <h2 className="text-emerald-400 font-mono mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Recent Password Resets
            </h2>
            <div className="space-y-3">
              {recentResets.map((reset, index) => (
                <div key={index} className="p-4 bg-black/40 border border-emerald-500/10 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <div className="text-gray-100 text-sm mb-1">{reset.user}</div>
                      <div className="text-xs text-gray-500 font-mono">{reset.email}</div>
                    </div>
                    <span className={`px-2 py-1 text-xs font-mono ${reset.status === 'Completed' ? 'bg-emerald-950/40 border border-emerald-500/30 text-emerald-400' : 'bg-yellow-950/40 border border-yellow-500/30 text-yellow-400'} rounded`}>
                      {reset.status}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-600 font-mono">
                    <span>By: {reset.requestedBy}</span>
                    <span>{reset.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
