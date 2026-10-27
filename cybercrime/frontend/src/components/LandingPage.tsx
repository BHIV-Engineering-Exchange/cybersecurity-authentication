import { Shield, Terminal, UserCog, Users, ArrowRight, Lock, Activity, Brain, Database, FileText, AlertTriangle, MapPin, BarChart3, Zap, CheckCircle, Server, Cpu, Eye, TrendingUp, Upload, Phone, Mail } from "lucide-react";

interface LandingPageProps {
  setCurrentPage: (page: "landing" | "admin-login" | "investigator-login" | "admin-dashboard" | "investigator-dashboard") => void;
}

export function LandingPage({ setCurrentPage }: LandingPageProps) {
  const features = [
    {
      icon: Brain,
      title: "AI-Powered Fraud Detection",
      description: "Machine Learning & Reinforcement Learning models for real-time transaction analysis",
      color: "purple"
    },
    {
      icon: Database,
      title: "Evidence Management",
      description: "Secure storage, tracking, and analysis of digital evidence files",
      color: "cyan"
    },
    {
      icon: MapPin,
      title: "Geographic Threat Mapping",
      description: "Visualize complaint locations and threat patterns on interactive maps",
      color: "emerald"
    },
    {
      icon: BarChart3,
      title: "Real-Time Analytics",
      description: "Live dashboards with activity feeds, risk trends, and performance metrics",
      color: "orange"
    },
    {
      icon: Users,
      title: "Investigator Management",
      description: "Comprehensive investigator tracking, activity monitoring, and communication",
      color: "blue"
    },
    {
      icon: AlertTriangle,
      title: "Case Escalation",
      description: "Automated workflow for high-risk cases and wallet freezing/unfreezing",
      color: "red"
    }
  ];


  return (
    <div className="min-h-screen bg-black overflow-y-auto">
      {/* Background Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl top-0 left-0 animate-pulse"></div>
        <div className="absolute w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl top-1/2 right-0 animate-pulse" style={{ animationDelay: "1s" }}></div>
        <div className="absolute w-96 h-96 bg-purple-500/10 rounded-full blur-3xl bottom-0 left-1/2 animate-pulse" style={{ animationDelay: "2s" }}></div>
      </div>

      <div className="relative z-10">
        {/* Header Section */}
        <div className="text-center py-16 px-4">
          <div className="relative flex items-center justify-center mb-8 h-32">
            {/* Glow effect */}
            <div className="absolute w-40 h-40 bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-full blur-3xl opacity-20 animate-pulse"></div>
            
            {/* Orbiting rings */}
            <div className="relative w-32 h-32 flex items-center justify-center">
              <div className="absolute inset-0 w-32 h-32">
                <div className="w-full h-full border-2 border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin"></div>
              </div>
              <div className="absolute inset-0 w-32 h-32">
                <div className="w-full h-full border-2 border-cyan-400/30 border-b-cyan-400 rounded-full animate-spin" style={{ animationDirection: "reverse", animationDuration: "3s" }}></div>
              </div>
              
              {/* Center shield */}
              <div className="relative bg-black/80 backdrop-blur-xl p-6 rounded-full border border-emerald-500/30 shadow-lg shadow-emerald-500/20 z-10">
                <Shield className="w-12 h-12 text-emerald-400" />
                <div className="absolute -top-2 -right-2 w-4 h-4 bg-emerald-400 rounded-full animate-pulse shadow-lg shadow-emerald-400/50"></div>
              </div>
            </div>
          </div>

          <h1 className="text-6xl md:text-7xl mb-4 bg-gradient-to-r from-emerald-400 via-cyan-400 to-purple-500 bg-clip-text text-transparent font-bold">
            Rakshan
          </h1>
          <div className="h-1 w-48 mx-auto bg-gradient-to-r from-transparent via-emerald-400 to-transparent mb-4"></div>
          <p className="text-gray-300 text-lg md:text-xl flex items-center justify-center gap-2 font-mono mb-2">
            <Lock className="w-5 h-5 text-emerald-400" />
            SECURE INVESTIGATION PLATFORM
          </p>
          <p className="text-gray-400 text-sm max-w-2xl mx-auto font-mono mb-6">
            Advanced AI-powered fraud detection, evidence management, and case investigation system
          </p>
          <div className="flex items-center justify-center gap-4 mt-4 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <Activity className="w-3 h-3 text-emerald-400" />
              SYSTEM ONLINE
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Lock className="w-3 h-3 text-cyan-400" />
              ENCRYPTED
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Server className="w-3 h-3 text-purple-400" />
              SECURED
            </span>
          </div>
        </div>

        {/* Features Section */}
        <div className="max-w-6xl mx-auto px-4 mb-12">
          <h2 className="text-2xl font-mono text-emerald-400 mb-6 text-center">System Capabilities</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((feature, idx) => {
              const Icon = feature.icon;
              const colorConfigs = {
                purple: {
                  bg: "bg-purple-500/10",
                  border: "border-purple-500/30",
                  text: "text-purple-400"
                },
                cyan: {
                  bg: "bg-cyan-500/10",
                  border: "border-cyan-500/30",
                  text: "text-cyan-400"
                },
                emerald: {
                  bg: "bg-emerald-500/10",
                  border: "border-emerald-500/30",
                  text: "text-emerald-400"
                },
                orange: {
                  bg: "bg-orange-500/10",
                  border: "border-orange-500/30",
                  text: "text-orange-400"
                },
                blue: {
                  bg: "bg-blue-500/10",
                  border: "border-blue-500/30",
                  text: "text-blue-400"
                },
                red: {
                  bg: "bg-red-500/10",
                  border: "border-red-500/30",
                  text: "text-red-400"
                }
              };
              const config = colorConfigs[feature.color as keyof typeof colorConfigs] || colorConfigs.emerald;
              return (
                <div
                  key={idx}
                  className="bg-gradient-to-br from-gray-900/80 to-black/80 backdrop-blur-xl border border-emerald-500/20 rounded-lg p-6 hover:border-emerald-500/40 transition-all group"
                >
                  <div className={`p-3 ${config.bg} border ${config.border} rounded-lg w-fit mb-4 group-hover:scale-110 transition-transform`}>
                    <Icon className={`w-6 h-6 ${config.text}`} />
                  </div>
                  <h3 className={`text-lg font-mono ${config.text} mb-2`}>{feature.title}</h3>
                  <p className="text-gray-400 text-sm font-mono">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Key Features List */}
        <div className="max-w-4xl mx-auto px-4 mb-12">
          <div className="bg-gradient-to-br from-gray-900/80 to-black/80 backdrop-blur-xl border border-cyan-500/20 rounded-lg p-6">
            <h3 className="text-xl font-mono text-cyan-400 mb-4 flex items-center gap-2">
              <Zap className="w-5 h-5" />
              Key Features
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-emerald-400 font-mono text-sm mb-1">AI Fraud Detection</p>
                    <p className="text-gray-500 text-xs font-mono">ML & RL models for transaction fraud analysis</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-cyan-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-cyan-400 font-mono text-sm mb-1">Evidence Management</p>
                    <p className="text-gray-500 text-xs font-mono">Secure file storage and tracking system</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-purple-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-purple-400 font-mono text-sm mb-1">Real-Time Monitoring</p>
                    <p className="text-gray-500 text-xs font-mono">Live activity feeds and notifications</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-orange-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-orange-400 font-mono text-sm mb-1">Geographic Mapping</p>
                    <p className="text-gray-500 text-xs font-mono">Threat visualization and location tracking</p>
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-blue-400 font-mono text-sm mb-1">Investigator Dashboard</p>
                    <p className="text-gray-500 text-xs font-mono">Self-service portal with activity tracking</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-red-400 font-mono text-sm mb-1">Case Escalation</p>
                    <p className="text-gray-500 text-xs font-mono">Automated workflow for high-risk wallets</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-yellow-400 font-mono text-sm mb-1">Communication Hub</p>
                    <p className="text-gray-500 text-xs font-mono">Secure messaging between superadmin and investigators</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-pink-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-pink-400 font-mono text-sm mb-1">Risk Analytics</p>
                    <p className="text-gray-500 text-xs font-mono">Trend analysis and predictive insights</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Login Options */}
        <div className="max-w-5xl mx-auto px-4 mb-12">
          <h2 className="text-2xl font-mono text-emerald-400 mb-6 text-center">Access Portal</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Admin Login Card */}
            <button
              onClick={() => setCurrentPage("admin-login")}
              className="group relative bg-gradient-to-br from-gray-900/80 to-black/80 backdrop-blur-xl border border-red-500/30 rounded-xl p-8 hover:border-red-500/60 transition-all duration-300"
            >
              {/* Corner brackets */}
              <div className="absolute -top-2 -left-2 w-8 h-8 border-t-2 border-l-2 border-red-400 opacity-50 group-hover:opacity-100 transition"></div>
              <div className="absolute -top-2 -right-2 w-8 h-8 border-t-2 border-r-2 border-orange-400 opacity-50 group-hover:opacity-100 transition"></div>
              <div className="absolute -bottom-2 -left-2 w-8 h-8 border-b-2 border-l-2 border-orange-400 opacity-50 group-hover:opacity-100 transition"></div>
              <div className="absolute -bottom-2 -right-2 w-8 h-8 border-b-2 border-r-2 border-red-400 opacity-50 group-hover:opacity-100 transition"></div>

              {/* Glow effect */}
              <div className="absolute -inset-1 bg-gradient-to-r from-red-500 to-orange-500 rounded-xl blur-lg opacity-0 group-hover:opacity-30 transition-opacity duration-500"></div>
              
              <div className="relative">
                <div className="flex items-center justify-center mb-6">
                  <div className="p-5 bg-gradient-to-br from-red-600/20 to-orange-600/20 border border-red-500/40 rounded-xl group-hover:scale-110 transition-transform duration-300">
                    <UserCog className="w-12 h-12 text-red-400" />
                  </div>
                </div>

                <h2 className="text-2xl mb-3 bg-gradient-to-r from-red-400 to-orange-400 bg-clip-text text-transparent">
                  SUPERADMIN ACCESS
                </h2>
                <p className="text-gray-400 text-sm mb-6 font-mono">
                  Full system control and administration
                </p>

                <div className="space-y-2 mb-6 text-left">
                  <div className="flex items-center gap-2 text-xs text-gray-500 font-mono">
                    <Eye className="w-3 h-3 text-red-400" />
                    <span>Dashboard & Analytics</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500 font-mono">
                    <Users className="w-3 h-3 text-red-400" />
                    <span>Investigator Management</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500 font-mono">
                    <Database className="w-3 h-3 text-red-400" />
                    <span>Evidence Library Access</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500 font-mono">
                    <AlertTriangle className="w-3 h-3 text-red-400" />
                    <span>Case Escalation Control</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500 font-mono">
                    <Brain className="w-3 h-3 text-red-400" />
                    <span>AI Model Management</span>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-2 text-red-400 font-mono text-sm group-hover:gap-3 transition-all">
                  <span>Access Control Panel</span>
                  <ArrowRight className="w-4 h-4" />
                </div>

                <div className="mt-6 pt-6 border-t border-red-500/20">
                  <div className="flex items-center justify-center gap-4 text-xs text-gray-600 font-mono">
                    <span className="flex items-center gap-1">
                      <Shield className="w-3 h-3 text-red-400" />
                      FULL PRIVILEGES
                    </span>
                    <span className="flex items-center gap-1">
                      <Terminal className="w-3 h-3 text-orange-400" />
                      SYSTEM CONTROL
                    </span>
                  </div>
                </div>
              </div>
            </button>

            {/* Investigator Login Card */}
            <button
              onClick={() => setCurrentPage("investigator-login")}
              className="group relative bg-gradient-to-br from-gray-900/80 to-black/80 backdrop-blur-xl border border-emerald-500/30 rounded-xl p-8 hover:border-emerald-500/60 transition-all duration-300"
            >
              {/* Corner brackets */}
              <div className="absolute -top-2 -left-2 w-8 h-8 border-t-2 border-l-2 border-emerald-400 opacity-50 group-hover:opacity-100 transition"></div>
              <div className="absolute -top-2 -right-2 w-8 h-8 border-t-2 border-r-2 border-cyan-400 opacity-50 group-hover:opacity-100 transition"></div>
              <div className="absolute -bottom-2 -left-2 w-8 h-8 border-b-2 border-l-2 border-cyan-400 opacity-50 group-hover:opacity-100 transition"></div>
              <div className="absolute -bottom-2 -right-2 w-8 h-8 border-b-2 border-r-2 border-emerald-400 opacity-50 group-hover:opacity-100 transition"></div>

              {/* Glow effect */}
              <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-xl blur-lg opacity-0 group-hover:opacity-30 transition-opacity duration-500"></div>
              
              <div className="relative">
                <div className="flex items-center justify-center mb-6">
                  <div className="p-5 bg-gradient-to-br from-emerald-600/20 to-cyan-600/20 border border-emerald-500/40 rounded-xl group-hover:scale-110 transition-transform duration-300">
                    <Users className="w-12 h-12 text-emerald-400" />
                  </div>
                </div>

                <h2 className="text-2xl mb-3 bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                  INVESTIGATOR ACCESS
                </h2>
                <p className="text-gray-400 text-sm mb-6 font-mono">
                  Field investigation and case management
                </p>

                <div className="space-y-2 mb-6 text-left">
                  <div className="flex items-center gap-2 text-xs text-gray-500 font-mono">
                    <FileText className="w-3 h-3 text-emerald-400" />
                    <span>Incident Reports & AI Analysis</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500 font-mono">
                    <Upload className="w-3 h-3 text-emerald-400" />
                    <span>Evidence Upload & Management</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500 font-mono">
                    <Phone className="w-3 h-3 text-emerald-400" />
                    <span>File Complaints</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500 font-mono">
                    <Mail className="w-3 h-3 text-emerald-400" />
                    <span>Messages & Notifications</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500 font-mono">
                    <BarChart3 className="w-3 h-3 text-emerald-400" />
                    <span>My Dashboard & Activity</span>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-2 text-emerald-400 font-mono text-sm group-hover:gap-3 transition-all">
                  <span>Access Case Portal</span>
                  <ArrowRight className="w-4 h-4" />
                </div>

                <div className="mt-6 pt-6 border-t border-emerald-500/20">
                  <div className="flex items-center justify-center gap-4 text-xs text-gray-600 font-mono">
                    <span className="flex items-center gap-1">
                      <Shield className="w-3 h-3 text-emerald-400" />
                      CASE ACCESS
                    </span>
                    <span className="flex items-center gap-1">
                      <Terminal className="w-3 h-3 text-cyan-400" />
                      FIELD TOOLS
                    </span>
                  </div>
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Technology Stack */}
        <div className="max-w-4xl mx-auto px-4 mb-12">
          <div className="bg-gradient-to-br from-gray-900/80 to-black/80 backdrop-blur-xl border border-purple-500/20 rounded-lg p-6">
            <h3 className="text-xl font-mono text-purple-400 mb-4 flex items-center gap-2">
              <Cpu className="w-5 h-5" />
              Technology Stack
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-emerald-400 font-mono text-sm mb-1">Frontend</p>
                <p className="text-gray-500 text-xs font-mono">React + TypeScript</p>
              </div>
              <div className="text-center">
                <p className="text-cyan-400 font-mono text-sm mb-1">Backend</p>
                <p className="text-gray-500 text-xs font-mono">FastAPI + Python</p>
              </div>
              <div className="text-center">
                <p className="text-purple-400 font-mono text-sm mb-1">AI/ML</p>
                <p className="text-gray-500 text-xs font-mono">Scikit-learn + RL</p>
              </div>
              <div className="text-center">
                <p className="text-orange-400 font-mono text-sm mb-1">Database</p>
                <p className="text-gray-500 text-xs font-mono">SQLite/PostgreSQL</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center py-8 px-4 space-y-2 border-t border-emerald-500/20">
          <p className="text-xs text-gray-600 font-mono flex items-center justify-center gap-2">
            <span className="text-emerald-400">█</span>
            v3.7.2-QUANTUM | Build 20251118.2359
            <span className="text-cyan-400">█</span>
          </p>
          <p className="text-xs text-gray-700 font-mono">
            AES-256 | RSA-4096 | SHA-512 | TLS 1.3
          </p>
          <p className="text-xs text-gray-800 font-mono mt-2">
            © 2024 Rakshan | All Rights Reserved
          </p>
        </div>
      </div>
    </div>
  );
}
