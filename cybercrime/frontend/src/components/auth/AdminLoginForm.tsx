import { useState, useEffect } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Shield, Lock, Mail, Terminal, AlertTriangle, Eye, EyeOff, UserCog, Activity, Cpu } from "lucide-react";

export function AdminLoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [glitchActive, setGlitchActive] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);

  useEffect(() => {
    const glitchInterval = setInterval(() => {
      setGlitchActive(true);
      setTimeout(() => setGlitchActive(false), 200);
    }, 5000);

    return () => clearInterval(glitchInterval);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setScanProgress((prev) => (prev >= 100 ? 0 : prev + 1));
    }, 50);
    return () => clearInterval(interval);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      // Redirect to admin dashboard
      window.location.href = '/admin.tsx';
    }, 2000);
  };

  return (
    <div className="w-full max-w-md">
      {/* Header */}
      <div className="text-center mb-8 relative">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-32 bg-gradient-to-r from-red-500 to-orange-500 rounded-full blur-3xl opacity-20 animate-pulse"></div>
        
        <div className="relative flex items-center justify-center mb-6">
          <div className="relative">
            <div className="absolute inset-0 w-24 h-24 -left-4 -top-4">
              <div className="w-full h-full border-2 border-red-400/30 border-t-red-400 rounded-full animate-spin"></div>
            </div>
            <div className="absolute inset-0 w-24 h-24 -left-4 -top-4">
              <div className="w-full h-full border-2 border-orange-400/30 border-b-orange-400 rounded-full animate-spin" style={{ animationDirection: "reverse", animationDuration: "3s" }}></div>
            </div>
            
            <div className="relative bg-black/80 backdrop-blur-xl p-4 rounded-full border border-red-500/30 shadow-lg shadow-red-500/20">
              <UserCog className="w-8 h-8 text-red-400" />
              <Terminal className="w-4 h-4 text-orange-400 absolute bottom-3 right-3" />
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-400 rounded-full animate-pulse"></div>
            </div>
          </div>
        </div>

        <h1 className={`text-5xl mb-3 bg-gradient-to-r from-red-400 via-orange-400 to-red-500 bg-clip-text text-transparent transition-all ${glitchActive ? 'blur-sm' : ''}`}>
          ADMIN PORTAL
        </h1>
        <div className="h-1 w-32 mx-auto bg-gradient-to-r from-transparent via-red-400 to-transparent mb-3"></div>
        <p className="text-gray-400 flex items-center justify-center gap-2 font-mono">
          <Shield className="w-4 h-4 text-red-400" />
          <span>ADMINISTRATOR ACCESS</span>
        </p>
        <div className="flex items-center justify-center gap-3 mt-2 text-xs text-gray-600">
          <span className="flex items-center gap-1">
            <Activity className="w-3 h-3 text-red-400" />
            SYSTEM CONTROL
          </span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <Cpu className="w-3 h-3 text-orange-400" />
            FULL PRIVILEGES
          </span>
        </div>
      </div>

      {/* Main Login Container */}
      <div className="relative group">
        <div className="absolute -top-2 -left-2 w-8 h-8 border-t-2 border-l-2 border-red-400 opacity-50"></div>
        <div className="absolute -top-2 -right-2 w-8 h-8 border-t-2 border-r-2 border-orange-400 opacity-50"></div>
        <div className="absolute -bottom-2 -left-2 w-8 h-8 border-b-2 border-l-2 border-orange-400 opacity-50"></div>
        <div className="absolute -bottom-2 -right-2 w-8 h-8 border-b-2 border-r-2 border-red-400 opacity-50"></div>

        <div className="absolute -inset-1 bg-gradient-to-r from-red-500 via-orange-500 to-red-500 rounded-lg blur-lg opacity-30 group-hover:opacity-50 transition-opacity duration-500"></div>
        <div className="absolute -inset-0.5 bg-gradient-to-r from-red-500 via-orange-500 to-red-500 rounded-lg blur opacity-20 animate-pulse"></div>
        
        <div className="relative bg-gradient-to-br from-gray-900/95 via-black/95 to-gray-900/95 backdrop-blur-xl border border-red-500/30 rounded-lg shadow-2xl overflow-hidden">
          <div 
            className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-orange-400 to-transparent opacity-50 transition-all duration-100"
            style={{ transform: `translateY(${scanProgress * 5}px)` }}
          ></div>

          <div className="absolute inset-0 opacity-5">
            <svg className="w-full h-full">
              <pattern id="circuit-admin" x="0" y="0" width="100" height="100" patternUnits="userSpaceOnUse">
                <circle cx="50" cy="50" r="2" fill="#ef4444" />
                <line x1="50" y1="50" x2="100" y2="50" stroke="#ef4444" strokeWidth="0.5" />
                <line x1="50" y1="50" x2="50" y2="0" stroke="#f97316" strokeWidth="0.5" />
              </pattern>
              <rect width="100%" height="100%" fill="url(#circuit-admin)" />
            </svg>
          </div>

          <div className="relative p-8">
            <div className="mb-6 p-4 bg-gradient-to-r from-red-950/40 to-orange-950/40 border border-red-500/30 rounded-lg backdrop-blur-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-red-400 text-sm font-mono flex items-center gap-2">
                  <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse shadow-lg shadow-red-400"></div>
                  ADMIN AUTHENTICATION
                </span>
                <span className="text-orange-400 text-xs font-mono">{scanProgress}%</span>
              </div>
              <div className="w-full h-1 bg-black/50 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-red-400 to-orange-400 transition-all duration-100"
                  style={{ width: `${scanProgress}%` }}
                ></div>
              </div>
            </div>

            <div className="mb-6 p-3 bg-gradient-to-r from-red-950/40 to-orange-950/40 border border-red-500/40 rounded-lg backdrop-blur-sm relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-red-500/5 to-orange-500/5 animate-pulse"></div>
              <div className="relative flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0 animate-pulse" />
                <div>
                  <p className="text-red-400 text-sm font-mono">
                    MAXIMUM SECURITY CLEARANCE REQUIRED
                  </p>
                  <p className="text-red-300/70 text-xs mt-1">
                    All administrative actions are logged and monitored
                  </p>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2 group/field">
                <Label htmlFor="email" className="text-gray-300 flex items-center gap-2 font-mono text-sm">
                  <Mail className="w-4 h-4 text-orange-400" />
                  ADMIN CREDENTIALS
                </Label>
                <div className="relative">
                  <Input
                    id="email"
                    type="email"
                    placeholder="admin@cybersec.gov"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-black/60 border-red-500/40 text-gray-100 placeholder:text-gray-600 focus:border-red-400 focus:ring-2 focus:ring-red-400/20 transition-all font-mono pr-10 backdrop-blur-sm"
                    required
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 w-2 h-2 bg-red-400 rounded-full opacity-0 group-focus-within/field:opacity-100 transition-opacity"></div>
                </div>
              </div>

              <div className="space-y-2 group/field">
                <Label htmlFor="password" className="text-gray-300 flex items-center gap-2 font-mono text-sm">
                  <Lock className="w-4 h-4 text-orange-400" />
                  SECURITY KEY
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-black/60 border-red-500/40 text-gray-100 placeholder:text-gray-600 focus:border-red-400 focus:ring-2 focus:ring-red-400/20 transition-all font-mono pr-10 backdrop-blur-sm"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-red-400 transition"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2 text-gray-400 cursor-pointer hover:text-red-400 transition group/check">
                  <div className="relative">
                    <input type="checkbox" className="peer sr-only" />
                    <div className="w-4 h-4 border-2 border-red-500/50 rounded bg-black/50 peer-checked:bg-gradient-to-br peer-checked:from-red-500 peer-checked:to-orange-500 transition"></div>
                    <svg className="absolute top-0.5 left-0.5 w-3 h-3 text-white opacity-0 peer-checked:opacity-100 transition pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <polyline points="20 6 9 17 4 12" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <span className="font-mono text-xs">Secure Session</span>
                </label>
                <a href="#" className="text-orange-400 hover:text-orange-300 transition font-mono text-xs">
                  Reset Credentials
                </a>
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full relative overflow-hidden bg-gradient-to-r from-red-600 via-orange-600 to-red-600 hover:from-red-500 hover:via-orange-500 hover:to-red-500 text-white shadow-lg shadow-red-500/30 transition-all duration-300 h-12 group/btn border border-red-400/30"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-1000"></div>
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2 font-mono">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    VERIFYING...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2 font-mono">
                    <Shield className="w-4 h-4" />
                    ADMIN ACCESS
                    <Terminal className="w-4 h-4" />
                  </span>
                )}
              </Button>
            </form>

            <div className="mt-6 pt-6 border-t border-gray-800">
              <div className="flex items-center justify-center gap-6 text-xs">
                <div className="flex items-center gap-1.5">
                  <div className="relative">
                    <div className="w-2 h-2 rounded-full bg-red-400 animate-pulse"></div>
                    <div className="absolute inset-0 w-2 h-2 rounded-full bg-red-400 animate-ping"></div>
                  </div>
                  <span className="text-gray-500 font-mono">SECURED</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="relative">
                    <div className="w-2 h-2 rounded-full bg-orange-400 animate-pulse"></div>
                    <div className="absolute inset-0 w-2 h-2 rounded-full bg-orange-400 animate-ping"></div>
                  </div>
                  <span className="text-gray-500 font-mono">ADMIN</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="text-center mt-6 space-y-2">
        <p className="text-xs text-gray-600 font-mono flex items-center justify-center gap-2">
          <span className="text-red-400">█</span>
          ADMIN v3.7.2 | CLEARANCE LEVEL: MAXIMUM
          <span className="text-orange-400">█</span>
        </p>
      </div>
    </div>
  );
}
