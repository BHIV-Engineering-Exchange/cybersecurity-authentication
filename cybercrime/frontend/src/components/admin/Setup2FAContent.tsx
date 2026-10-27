import { Shield, Smartphone, Key, QrCode, CheckCircle, XCircle } from "lucide-react";
import { Button } from "../ui/button";

export function Setup2FAContent() {
  const users = [
    { id: "USR-047", name: "Sarah Chen", email: "sarah.chen@cyber.gov", twoFA: true, method: "Authenticator App" },
    { id: "USR-091", name: "Marcus Rodriguez", email: "marcus.r@cyber.gov", twoFA: true, method: "SMS" },
    { id: "USR-012", name: "Emily Watson", email: "e.watson@cyber.gov", twoFA: false, method: "None" },
    { id: "USR-023", name: "David Kim", email: "david.kim@cyber.gov", twoFA: true, method: "Authenticator App" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent mb-2">
          Setup 2FA
        </h1>
        <p className="text-gray-500 font-mono text-sm">Two-Factor Authentication Management</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: "2FA Enabled", value: "58/64", icon: Shield, color: "emerald" },
          { label: "Authenticator App", value: "42", icon: Smartphone, color: "cyan" },
          { label: "SMS Based", value: "16", icon: Key, color: "purple" },
          { label: "Not Configured", value: "6", icon: XCircle, color: "red" },
        ].map((stat, index) => (
          <div key={index} className="bg-gradient-to-br from-gray-900/80 to-black/80 backdrop-blur-xl border border-emerald-500/20 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <stat.icon className={`w-8 h-8 text-${stat.color}-400`} />
              <div>
                <div className="text-2xl text-gray-100">{stat.value}</div>
                <div className="text-xs text-gray-500 font-mono">{stat.label}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Setup Methods */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-gradient-to-br from-gray-900/80 to-black/80 backdrop-blur-xl border border-emerald-500/20 rounded-lg p-6">
            <h2 className="text-emerald-400 font-mono mb-4">2FA Methods</h2>
            <div className="space-y-3">
              <div className="p-4 bg-gradient-to-r from-emerald-950/40 to-cyan-950/40 border border-emerald-500/30 rounded-lg">
                <div className="flex items-center gap-3 mb-2">
                  <Smartphone className="w-5 h-5 text-emerald-400" />
                  <span className="text-gray-100">Authenticator App</span>
                </div>
                <p className="text-xs text-gray-500 mb-3">
                  Use apps like Google Authenticator or Authy
                </p>
                <Button size="sm" className="w-full bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 font-mono text-xs">
                  Recommended
                </Button>
              </div>

              <div className="p-4 bg-black/40 border border-emerald-500/10 rounded-lg">
                <div className="flex items-center gap-3 mb-2">
                  <Key className="w-5 h-5 text-cyan-400" />
                  <span className="text-gray-100">SMS Verification</span>
                </div>
                <p className="text-xs text-gray-500 mb-3">
                  Receive codes via text message
                </p>
                <Button size="sm" variant="outline" className="w-full border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10 font-mono text-xs">
                  Setup
                </Button>
              </div>

              <div className="p-4 bg-black/40 border border-emerald-500/10 rounded-lg">
                <div className="flex items-center gap-3 mb-2">
                  <QrCode className="w-5 h-5 text-purple-400" />
                  <span className="text-gray-100">Hardware Token</span>
                </div>
                <p className="text-xs text-gray-500 mb-3">
                  Physical security keys (YubiKey, etc.)
                </p>
                <Button size="sm" variant="outline" className="w-full border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10 font-mono text-xs">
                  Setup
                </Button>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-gray-900/80 to-black/80 backdrop-blur-xl border border-emerald-500/20 rounded-lg p-6">
            <h2 className="text-emerald-400 font-mono mb-3">Policy Settings</h2>
            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer group">
                <div className="relative">
                  <input type="checkbox" className="peer sr-only" defaultChecked />
                  <div className="w-10 h-6 bg-black/50 border border-emerald-500/40 rounded-full peer-checked:bg-emerald-600 transition"></div>
                  <div className="absolute top-1 left-1 w-4 h-4 bg-gray-400 rounded-full peer-checked:translate-x-4 peer-checked:bg-white transition"></div>
                </div>
                <span className="text-gray-400 text-sm font-mono group-hover:text-emerald-400 transition">Enforce 2FA for all users</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer group">
                <div className="relative">
                  <input type="checkbox" className="peer sr-only" />
                  <div className="w-10 h-6 bg-black/50 border border-emerald-500/40 rounded-full peer-checked:bg-emerald-600 transition"></div>
                  <div className="absolute top-1 left-1 w-4 h-4 bg-gray-400 rounded-full peer-checked:translate-x-4 peer-checked:bg-white transition"></div>
                </div>
                <span className="text-gray-400 text-sm font-mono group-hover:text-emerald-400 transition">Allow SMS as backup</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer group">
                <div className="relative">
                  <input type="checkbox" className="peer sr-only" defaultChecked />
                  <div className="w-10 h-6 bg-black/50 border border-emerald-500/40 rounded-full peer-checked:bg-emerald-600 transition"></div>
                  <div className="absolute top-1 left-1 w-4 h-4 bg-gray-400 rounded-full peer-checked:translate-x-4 peer-checked:bg-white transition"></div>
                </div>
                <span className="text-gray-400 text-sm font-mono group-hover:text-emerald-400 transition">Trust devices for 30 days</span>
              </label>
            </div>
          </div>
        </div>

        {/* User 2FA Status */}
        <div className="lg:col-span-2">
          <div className="bg-gradient-to-br from-gray-900/80 to-black/80 backdrop-blur-xl border border-emerald-500/20 rounded-lg overflow-hidden">
            <div className="p-4 border-b border-emerald-500/20 bg-black/40">
              <h2 className="text-emerald-400 font-mono">User 2FA Status</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-emerald-500/20 bg-black/40">
                    <th className="text-left p-4 text-emerald-400 font-mono text-sm">User ID</th>
                    <th className="text-left p-4 text-emerald-400 font-mono text-sm">Name</th>
                    <th className="text-left p-4 text-emerald-400 font-mono text-sm">Email</th>
                    <th className="text-left p-4 text-emerald-400 font-mono text-sm">2FA Status</th>
                    <th className="text-left p-4 text-emerald-400 font-mono text-sm">Method</th>
                    <th className="text-left p-4 text-emerald-400 font-mono text-sm">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user, index) => (
                    <tr key={index} className="border-b border-emerald-500/10 hover:bg-emerald-500/5 transition">
                      <td className="p-4 font-mono text-sm text-cyan-400">{user.id}</td>
                      <td className="p-4 text-gray-300">{user.name}</td>
                      <td className="p-4 font-mono text-sm text-gray-500">{user.email}</td>
                      <td className="p-4">
                        {user.twoFA ? (
                          <span className="flex items-center gap-2 text-emerald-400">
                            <CheckCircle className="w-4 h-4" />
                            <span className="font-mono text-sm">Enabled</span>
                          </span>
                        ) : (
                          <span className="flex items-center gap-2 text-red-400">
                            <XCircle className="w-4 h-4" />
                            <span className="font-mono text-sm">Disabled</span>
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-gray-400 text-sm">{user.method}</td>
                      <td className="p-4">
                        {user.twoFA ? (
                          <Button size="sm" variant="outline" className="border-red-500/40 text-red-400 hover:bg-red-500/10 text-xs font-mono">
                            Disable
                          </Button>
                        ) : (
                          <Button size="sm" className="bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-xs font-mono">
                            Enable
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
