import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Shield, Lock, Mail, Terminal, AlertTriangle, Eye, EyeOff, Fingerprint, Cpu, Activity } from "lucide-react";

export function LoginForm() {
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
      console.log("Login attempted with:", { email, password });
    }, 2000);
  };

  return (
    <div className="w-full max-w-md">
      {/* Holographic Header */}
      <div className="text-center mb-8 relative">
        {/* Glowing orb effect */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-32 bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-full blur-3xl opacity-20 animate-pulse"></div>
        
        <div className="relative flex items-center justify-center mb-6">
          <div className="relative">
            {/* Rotating ring */}
            <div className="absolute inset-0 w-24 h-24 -left-4 -top-4">
              <div className="w-full h-full border-2 border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin"></div>
            </div>
            <div className="absolute inset-0 w-24 h-24 -left-4 -top-4">
              <div className="w-full h-full border-2 border-cyan-400/30 border-b-cyan-400 rounded-full animate-spin" style={{ animationDirection: "reverse", animationDuration: "3s" }}></div>
            </div>
            
            {/* Center icon */}
            <div className="relative bg-black/80 backdrop-blur-xl p-4 rounded-full border border-emerald-500/30 shadow-lg shadow-emerald-500/20">
              <Shield className="w-8 h-8 text-emerald-400" />
              <Terminal className="w-4 h-4 text-cyan-400 absolute bottom-3 right-3" />
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full animate-pulse"></div>
            </div>
          </div>
        </div>

        <h1 className={`text-5xl mb-3 bg-gradient-to-r from-emerald-400 via-cyan-400 to-purple-500 bg-clip-text text-transparent transition-all ${glitchActive ? 'blur-sm' : ''}`}>
          CYBERCRIME
        </h1>
        <div className="h-1 w-32 mx-auto bg-gradient-to-r from-transparent via-emerald-400 to-transparent mb-3"></div>
        <p className="text-gray-400 flex items-center justify-center gap-2">
          <Lock className="w-4 h-4" />
          <span className="font-mono">SECURE ACCESS TERMINAL</span>
        </p>
        <div className="flex items-center justify-center gap-3 mt-2 text-xs text-gray-600">
          <span className="flex items-center gap-1">
            <Activity className="w-3 h-3 text-emerald-400" />
            256-BIT ENCRYPTION
          </span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <Cpu className="w-3 h-3 text-cyan-400" />
            QUANTUM SAFE
          </span>
        </div>
      </div>

      {/* Main Login Container */}
      <div className="relative group">
        {/* Animated corner brackets */}
        <div className="absolute -top-2 -left-2 w-8 h-8 border-t-2 border-l-2 border-emerald-400 opacity-50"></div>
        <div className="absolute -top-2 -right-2 w-8 h-8 border-t-2 border-r-2 border-cyan-400 opacity-50"></div>
        <div className="absolute -bottom-2 -left-2 w-8 h-8 border-b-2 border-l-2 border-cyan-400 opacity-50"></div>
        <div className="absolute -bottom-2 -right-2 w-8 h-8 border-b-2 border-r-2 border-emerald-400 opacity-50"></div>

        {/* Multi-layer glowing borders */}
        <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500 via-cyan-500 to-purple-500 rounded-lg blur-lg opacity-30 group-hover:opacity-50 transition-opacity duration-500"></div>
        <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500 via-cyan-500 to-purple-500 rounded-lg blur opacity-20 animate-pulse"></div>
        
        <div className="relative bg-gradient-to-br from-gray-900/95 via-black/95 to-gray-900/95 backdrop-blur-xl border border-emerald-500/30 rounded-lg shadow-2xl overflow-hidden">
          {/* Scan line animation */}
          <div 
            className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-50 transition-all duration-100"
            style={{ transform: `translateY(${scanProgress * 5}px)` }}
          ></div>

          {/* Circuit pattern overlay */}
          <div className="absolute inset-0 opacity-5">
            <svg className="w-full h-full">
              <pattern id="circuit" x="0" y="0" width="100" height="100" patternUnits="userSpaceOnUse">
                <circle cx="50" cy="50" r="2" fill="#10b981" />
                <line x1="50" y1="50" x2="100" y2="50" stroke="#10b981" strokeWidth="0.5" />
                <line x1="50" y1="50" x2="50" y2="0" stroke="#22d3ee" strokeWidth="0.5" />
              </pattern>
              <rect width="100%" height="100%" fill="url(#circuit)" />
            </svg>
          </div>

          <div className="relative p-8">
            {/* System Status Banner */}
            <div className="mb-6 p-4 bg-gradient-to-r from-emerald-950/40 to-cyan-950/40 border border-emerald-500/30 rounded-lg backdrop-blur-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-emerald-400 text-sm font-mono flex items-center gap-2">
                  <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse shadow-lg shadow-emerald-400"></div>
                  SYSTEM STATUS: ACTIVE
                </span>
                <span className="text-cyan-400 text-xs font-mono">{scanProgress}%</span>
              </div>
              <div className="w-full h-1 bg-black/50 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-emerald-400 to-cyan-400 transition-all duration-100"
                  style={{ width: `${scanProgress}%` }}
                ></div>
              </div>
            </div>

            {/* Warning Banner */}
            <div className="mb-6 p-3 bg-gradient-to-r from-red-950/40 to-orange-950/40 border border-red-500/40 rounded-lg backdrop-blur-sm relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-red-500/5 to-orange-500/5 animate-pulse"></div>
              <div className="relative flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0 animate-pulse" />
                <div>
                  <p className="text-red-400 text-sm">
                    <span className="font-mono">RESTRICTED ACCESS</span>
                  </p>
                  <p className="text-red-300/70 text-xs mt-1">
                    Unauthorized access attempts will be traced and prosecuted
                  </p>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Email Field */}
              <div className="space-y-2 group/field">
                <Label htmlFor="email" className="text-gray-300 flex items-center gap-2 font-mono text-sm">
                  <Mail className="w-4 h-4 text-cyan-400" />
                  EMAIL IDENTIFIER
                </Label>
                <div className="relative">
                  <Input
                    id="email"
                    type="email"
                    placeholder="agent@blackhat.sec"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-black/60 border-emerald-500/40 text-gray-100 placeholder:text-gray-600 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 transition-all font-mono pr-10 backdrop-blur-sm"
                    required
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 w-2 h-2 bg-emerald-400 rounded-full opacity-0 group-focus-within/field:opacity-100 transition-opacity"></div>
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-2 group/field">
                <Label htmlFor="password" className="text-gray-300 flex items-center gap-2 font-mono text-sm">
                  <Lock className="w-4 h-4 text-cyan-400" />
                  ACCESS KEY
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-black/60 border-emerald-500/40 text-gray-100 placeholder:text-gray-600 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 transition-all font-mono pr-10 backdrop-blur-sm"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-emerald-400 transition"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Options */}
              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2 text-gray-400 cursor-pointer hover:text-emerald-400 transition group/check">
                  <div className="relative">
                    <input type="checkbox" className="peer sr-only" />
                    <div className="w-4 h-4 border-2 border-emerald-500/50 rounded bg-black/50 peer-checked:bg-gradient-to-br peer-checked:from-emerald-500 peer-checked:to-cyan-500 transition"></div>
                    <svg className="absolute top-0.5 left-0.5 w-3 h-3 text-white opacity-0 peer-checked:opacity-100 transition pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <polyline points="20 6 9 17 4 12" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <span className="font-mono text-xs">Remember Session</span>
                </label>
                <a href="#" className="text-cyan-400 hover:text-cyan-300 transition font-mono text-xs">
                  Reset Credentials
                </a>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full relative overflow-hidden bg-gradient-to-r from-emerald-600 via-cyan-600 to-emerald-600 hover:from-emerald-500 hover:via-cyan-500 hover:to-emerald-500 text-white shadow-lg shadow-emerald-500/30 transition-all duration-300 h-12 group/btn border border-emerald-400/30"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-1000"></div>
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2 font-mono">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    AUTHENTICATING...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2 font-mono">
                    <Shield className="w-4 h-4" />
                    INITIATE ACCESS
                    <Terminal className="w-4 h-4" />
                  </span>
                )}
              </Button>
            </form>

            {/* Footer */}
            <div className="mt-6 pt-6 border-t border-gray-800">
              <p className="text-center text-xs text-gray-500 font-mono mb-3">
                Need clearance? Contact system administrator
              </p>
              
              {/* Status Indicators */}
              <div className="flex items-center justify-center gap-6 text-xs">
                <div className="flex items-center gap-1.5">
                  <div className="relative">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
                    <div className="absolute inset-0 w-2 h-2 rounded-full bg-emerald-400 animate-ping"></div>
                  </div>
                  <span className="text-gray-500 font-mono">ONLINE</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="relative">
                    <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></div>
                    <div className="absolute inset-0 w-2 h-2 rounded-full bg-cyan-400 animate-ping"></div>
                  </div>
                  <span className="text-gray-500 font-mono">SECURED</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="relative">
                    <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse"></div>
                    <div className="absolute inset-0 w-2 h-2 rounded-full bg-purple-400 animate-ping"></div>
                  </div>
                  <span className="text-gray-500 font-mono">MONITORING</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Text */}
      <div className="text-center mt-6 space-y-2">
        <p className="text-xs text-gray-600 font-mono flex items-center justify-center gap-2">
          <span className="text-emerald-400">█</span>
          v3.7.2-QUANTUM | Build 20251118.2359
          <span className="text-cyan-400">█</span>
        </p>
        <p className="text-xs text-gray-700 font-mono">
          AES-256 | RSA-4096 | SHA-512 | TLS 1.3
        </p>
      </div>
    </div>
  );
}