import { useState, useEffect } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Shield, Lock, Mail, Terminal, AlertTriangle, Eye, EyeOff, Users, Activity, ArrowLeft, FolderOpen, UserPlus } from "lucide-react";
import { apiUrl } from "@/lib/api";

interface InvestigatorLoginProps {
  setCurrentPage: (page: "landing" | "admin-login" | "investigator-login" | "admin-dashboard" | "investigator-dashboard") => void;
}

export function InvestigatorLogin({ setCurrentPage }: InvestigatorLoginProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [glitchActive, setGlitchActive] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [showCreateAccount, setShowCreateAccount] = useState(false);

  // Create account form states
  const [createName, setCreateName] = useState("");
  const [createEmail, setCreateEmail] = useState("");
  const [createPassword, setCreatePassword] = useState("");
  const [createConfirmPassword, setCreateConfirmPassword] = useState("");
  const [showCreatePassword, setShowCreatePassword] = useState(false);
  const [showCreateConfirmPassword, setShowCreateConfirmPassword] = useState(false);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createResult, setCreateResult] = useState<{ success: boolean; message: string } | null>(null);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Normalize email (lowercase, trim)
      const normalizedEmail = email.toLowerCase().trim();

      // Use FormData for OAuth2PasswordRequestForm compatibility
      const formData = new FormData();
      formData.append("username", normalizedEmail); // OAuth2 uses "username" field for email
      formData.append("password", password);
      const response = await fetch(apiUrl("auth/login"), {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        // Store token in localStorage
        localStorage.setItem("investigator_token", data.access_token);
        localStorage.setItem("investigator_email", normalizedEmail);
        // Redirect to investigator dashboard
        setCurrentPage("investigator-dashboard");
      } else {
        const errorData = await response.json().catch(() => ({}));
        alert(errorData.detail || "Login failed. Please check your credentials.");
      }
    } catch (error) {
      console.error("Login error:", error);
      alert("Error connecting to server. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateAccountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateResult(null);

    const fullName = createName.trim();
    const emailValue = createEmail.trim().toLowerCase();
    const passwordValue = createPassword.trim();
    const confirmPasswordValue = createConfirmPassword.trim();

    if (!fullName || !emailValue || !passwordValue || !confirmPasswordValue) {
      setCreateResult({ success: false, message: "Please fill all required fields." });
      return;
    }

    if (passwordValue !== confirmPasswordValue) {
      setCreateResult({ success: false, message: "Passwords do not match." });
      return;
    }

    setCreateSubmitting(true);
    try {
      const response = await fetch(apiUrl("access-requests/request"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: fullName,
          email: emailValue,
          reason: "Self-service request from investigator login portal",
          requested_password: passwordValue,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const errorMessage =
          data?.error?.message ||
          data?.detail ||
          data?.message ||
          `Failed to submit request (${response.status})`;
        setCreateResult({ success: false, message: errorMessage });
        return;
      }

      setCreateResult({
        success: true,
        message: "Access request submitted successfully. Please wait for admin approval.",
      });
      setCreateName("");
      setCreateEmail("");
      setCreatePassword("");
      setCreateConfirmPassword("");
    } catch (error) {
      setCreateResult({
        success: false,
        message: "Network error while submitting request. Please try again.",
      });
    } finally {
      setCreateSubmitting(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <div className="w-full max-w-md">
        {/* Back Button */}
        <button
          onClick={() => setCurrentPage("landing")}
          className="flex items-center gap-2 text-gray-500 hover:text-emerald-400 transition mb-6 font-mono text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Portal
        </button>

        {/* Header */}
        <div className="text-center mb-8 relative">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-32 bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-full blur-3xl opacity-20 animate-pulse"></div>

          <div className="relative flex items-center justify-center mb-6">
            <div className="relative">
              <div className="absolute inset-0 w-24 h-24 -left-4 -top-4">
                <div className="w-full h-full border-2 border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin"></div>
              </div>
              <div className="absolute inset-0 w-24 h-24 -left-4 -top-4">
                <div className="w-full h-full border-2 border-cyan-400/30 border-b-cyan-400 rounded-full animate-spin" style={{ animationDirection: "reverse", animationDuration: "3s" }}></div>
              </div>

              <div className="relative bg-black/80 backdrop-blur-xl p-4 rounded-full border border-emerald-500/30 shadow-lg shadow-emerald-500/20">
                <Users className="w-8 h-8 text-emerald-400" />
                <Terminal className="w-4 h-4 text-cyan-400 absolute bottom-3 right-3" />
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full animate-pulse"></div>
              </div>
            </div>
          </div>

          <h1 className={`text-5xl mb-3 bg-gradient-to-r from-emerald-400 via-cyan-400 to-emerald-500 bg-clip-text text-transparent transition-all ${glitchActive ? 'blur-sm' : ''}`}>
            INVESTIGATOR
          </h1>
          <div className="h-1 w-32 mx-auto bg-gradient-to-r from-transparent via-emerald-400 to-transparent mb-3"></div>
          <p className="text-gray-400 flex items-center justify-center gap-2 font-mono">
            <Shield className="w-4 h-4 text-emerald-400" />
            <span>FIELD AGENT ACCESS</span>
          </p>
          <div className="flex items-center justify-center gap-3 mt-2 text-xs text-gray-600">
            <span className="flex items-center gap-1">
              <Activity className="w-3 h-3 text-emerald-400" />
              CASE MANAGER
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <FolderOpen className="w-3 h-3 text-cyan-400" />
              EVIDENCE ACCESS
            </span>
          </div>
        </div>

        {/* Main Login Container */}
        <div className="relative group">
          <div className="absolute -top-2 -left-2 w-8 h-8 border-t-2 border-l-2 border-emerald-400 opacity-50"></div>
          <div className="absolute -top-2 -right-2 w-8 h-8 border-t-2 border-r-2 border-cyan-400 opacity-50"></div>
          <div className="absolute -bottom-2 -left-2 w-8 h-8 border-b-2 border-l-2 border-cyan-400 opacity-50"></div>
          <div className="absolute -bottom-2 -right-2 w-8 h-8 border-b-2 border-r-2 border-emerald-400 opacity-50"></div>

          <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500 via-cyan-500 to-emerald-500 rounded-lg blur-lg opacity-30 group-hover:opacity-50 transition-opacity duration-500"></div>
          <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500 via-cyan-500 to-emerald-500 rounded-lg blur opacity-20 animate-pulse"></div>

          <div className="relative bg-gradient-to-br from-gray-900/95 via-black/95 to-gray-900/95 backdrop-blur-xl border border-emerald-500/30 rounded-lg shadow-2xl overflow-hidden">
            <div
              className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-50 transition-all duration-100"
              style={{ transform: `translateY(${scanProgress * 5}px)` }}
            ></div>

            <div className="absolute inset-0 opacity-5">
              <svg className="w-full h-full">
                <pattern id="circuit-investigator" x="0" y="0" width="100" height="100" patternUnits="userSpaceOnUse">
                  <circle cx="50" cy="50" r="2" fill="#10b981" />
                  <line x1="50" y1="50" x2="100" y2="50" stroke="#10b981" strokeWidth="0.5" />
                  <line x1="50" y1="50" x2="50" y2="0" stroke="#22d3ee" strokeWidth="0.5" />
                </pattern>
                <rect width="100%" height="100%" fill="url(#circuit-investigator)" />
              </svg>
            </div>

            <div className="relative p-8">
              <div className="mb-6 p-4 bg-gradient-to-r from-emerald-950/40 to-cyan-950/40 border border-emerald-500/30 rounded-lg backdrop-blur-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-emerald-400 text-sm font-mono flex items-center gap-2">
                    <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse shadow-lg shadow-emerald-400"></div>
                    INVESTIGATOR AUTHENTICATION
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

              <div className="mb-6 p-3 bg-gradient-to-r from-cyan-950/40 to-emerald-950/40 border border-cyan-500/40 rounded-lg backdrop-blur-sm relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 to-emerald-500/5 animate-pulse"></div>
                <div className="relative flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 text-cyan-400 mt-0.5 flex-shrink-0 animate-pulse" />
                  <div>
                    <p className="text-cyan-400 text-sm font-mono">
                      AUTHORIZED PERSONNEL ONLY
                    </p>
                    <p className="text-cyan-300/70 text-xs mt-1">
                      Access to sensitive case data - all activity monitored
                    </p>
                  </div>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2 group/field">
                  <Label htmlFor="email" className="text-gray-300 flex items-center gap-2 font-mono text-sm">
                    <Mail className="w-4 h-4 text-cyan-400" />
                    AGENT IDENTIFIER
                  </Label>
                  <div className="relative">
                    <Input
                      id="email"
                      type="email"
                      placeholder="agent@field.cybersec.gov"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="bg-black/60 border-emerald-500/40 text-gray-100 placeholder:text-gray-600 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 transition-all font-mono pr-10 backdrop-blur-sm"
                      required
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 w-2 h-2 bg-emerald-400 rounded-full opacity-0 group-focus-within/field:opacity-100 transition-opacity"></div>
                  </div>
                </div>

                <div className="space-y-2 group/field">
                  <Label htmlFor="password" className="text-gray-300 flex items-center gap-2 font-mono text-sm">
                    <Lock className="w-4 h-4 text-cyan-400" />
                    ACCESS CODE
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

                <div className="flex items-center justify-between text-sm">
                  <label className="flex items-center gap-2 text-gray-400 cursor-pointer hover:text-emerald-400 transition group/check">
                    <div className="relative">
                      <input type="checkbox" className="peer sr-only" />
                      <div className="w-4 h-4 border-2 border-emerald-500/50 rounded bg-black/50 peer-checked:bg-gradient-to-br peer-checked:from-emerald-500 peer-checked:to-cyan-500 transition"></div>
                      <svg className="absolute top-0.5 left-0.5 w-3 h-3 text-white opacity-0 peer-checked:opacity-100 transition pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <polyline points="20 6 9 17 4 12" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                    <span className="font-mono text-xs">Remember Session</span>
                  </label>
                  <a href="#" className="text-cyan-400 hover:text-cyan-300 transition font-mono text-xs">
                    Reset Credentials
                  </a>
                </div>

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
                      ACCESS PORTAL
                      <Terminal className="w-4 h-4" />
                    </span>
                  )}
                </Button>
              </form>

              <div className="mt-6 pt-6 border-t border-gray-800">
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
                </div>
              </div>

              {/* Create Account Section */}
              <div className="mt-6 pt-6 border-t border-emerald-500/20">
                <div className="text-center">
                  <p className="text-gray-500 text-sm mb-3 font-mono">New to the field?</p>
                  <button
                    onClick={() => {
                      // Handle create account navigation
                      console.log("Create investigator account");
                      setShowCreateAccount(true);
                    }}
                    className="group/create relative w-full px-6 py-3 bg-gradient-to-r from-gray-900/60 to-black/60 border border-emerald-500/30 hover:border-emerald-400/60 rounded-lg transition-all duration-300 overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/0 via-emerald-500/10 to-emerald-500/0 translate-x-[-100%] group-hover/create:translate-x-[100%] transition-transform duration-700"></div>
                    <div className="relative flex items-center justify-center gap-2">
                      <Users className="w-4 h-4 text-emerald-400" />
                      <span className="font-mono text-sm text-emerald-400 group-hover/create:text-emerald-300 transition">
                        REQUEST INVESTIGATOR ACCESS
                      </span>
                      <Shield className="w-4 h-4 text-cyan-400" />
                    </div>
                  </button>
                  <p className="text-gray-600 text-xs mt-3 font-mono">
                    Requires admin approval • 24-48hr processing
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="text-center mt-6 space-y-2">
          <p className="text-xs text-gray-600 font-mono flex items-center justify-center gap-2">
            <span className="text-emerald-400">█</span>
            FIELD v3.7.2 | CLEARANCE LEVEL: INVESTIGATOR
            <span className="text-cyan-400">█</span>
          </p>
        </div>
      </div>

      {/* Create Account Form */}
      {showCreateAccount && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-lg relative">
            {/* Corner brackets */}
            <div className="absolute -top-2 -left-2 w-8 h-8 border-t-2 border-l-2 border-emerald-400 opacity-50"></div>
            <div className="absolute -top-2 -right-2 w-8 h-8 border-t-2 border-r-2 border-cyan-400 opacity-50"></div>
            <div className="absolute -bottom-2 -left-2 w-8 h-8 border-b-2 border-l-2 border-cyan-400 opacity-50"></div>
            <div className="absolute -bottom-2 -right-2 w-8 h-8 border-b-2 border-r-2 border-emerald-400 opacity-50"></div>

            <div className="relative bg-gradient-to-br from-gray-900/95 via-black/95 to-gray-900/95 backdrop-blur-xl border border-emerald-500/30 rounded-lg shadow-2xl overflow-hidden">
              {/* Circuit pattern background */}
              <div className="absolute inset-0 opacity-5">
                <svg className="w-full h-full">
                  <pattern id="circuit-create" x="0" y="0" width="100" height="100" patternUnits="userSpaceOnUse">
                    <circle cx="50" cy="50" r="2" fill="#10b981" />
                    <line x1="50" y1="50" x2="100" y2="50" stroke="#10b981" strokeWidth="0.5" />
                    <line x1="50" y1="50" x2="50" y2="0" stroke="#22d3ee" strokeWidth="0.5" />
                  </pattern>
                  <rect width="100%" height="100%" fill="url(#circuit-create)" />
                </svg>
              </div>

              <div className="relative p-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 rounded-lg border border-emerald-500/30">
                      <UserPlus className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div>
                      <h2 className="text-xl text-emerald-400 font-mono">REQUEST ACCESS</h2>
                      <p className="text-xs text-gray-500 font-mono">New Investigator Registration</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setShowCreateAccount(false);
                      setCreateResult(null);
                    }}
                    className="p-2 text-gray-500 hover:text-emerald-400 transition hover:bg-emerald-500/10 rounded"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                </div>

                {/* Alert */}
                <div className="mb-6 p-3 bg-gradient-to-r from-emerald-950/40 to-cyan-950/40 border border-emerald-500/40 rounded-lg backdrop-blur-sm relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 to-cyan-500/5 animate-pulse"></div>
                  <div className="relative flex items-start gap-2">
                    <Shield className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-emerald-400 text-sm font-mono">
                        ADMIN APPROVAL REQUIRED
                      </p>
                      <p className="text-emerald-300/70 text-xs mt-1">
                        Account requests are reviewed within 24-48 hours
                      </p>
                    </div>
                  </div>
                </div>

                <form onSubmit={handleCreateAccountSubmit} className="space-y-5">
                  <div className="space-y-2 group/field">
                    <Label htmlFor="createName" className="text-gray-300 flex items-center gap-2 font-mono text-sm">
                      <UserPlus className="w-4 h-4 text-cyan-400" />
                      FULL NAME
                    </Label>
                    <div className="relative">
                      <Input
                        id="createName"
                        type="text"
                        placeholder="Agent John Doe"
                        value={createName}
                        onChange={(e) => setCreateName(e.target.value)}
                        className="bg-black/60 border-emerald-500/40 text-gray-100 placeholder:text-gray-600 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 transition-all font-mono pr-10 backdrop-blur-sm"
                        required
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 w-2 h-2 bg-emerald-400 rounded-full opacity-0 group-focus-within/field:opacity-100 transition-opacity"></div>
                    </div>
                  </div>

                  <div className="space-y-2 group/field">
                    <Label htmlFor="createEmail" className="text-gray-300 flex items-center gap-2 font-mono text-sm">
                      <Mail className="w-4 h-4 text-cyan-400" />
                      EMAIL ADDRESS
                    </Label>
                    <div className="relative">
                      <Input
                        id="createEmail"
                        type="email"
                        placeholder="agent@field.cybersec.gov"
                        value={createEmail}
                        onChange={(e) => setCreateEmail(e.target.value)}
                        className="bg-black/60 border-emerald-500/40 text-gray-100 placeholder:text-gray-600 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 transition-all font-mono pr-10 backdrop-blur-sm"
                        required
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 w-2 h-2 bg-emerald-400 rounded-full opacity-0 group-focus-within/field:opacity-100 transition-opacity"></div>
                    </div>
                  </div>

                  <div className="space-y-2 group/field">
                    <Label htmlFor="createPassword" className="text-gray-300 flex items-center gap-2 font-mono text-sm">
                      <Lock className="w-4 h-4 text-cyan-400" />
                      PASSWORD
                    </Label>
                    <div className="relative">
                      <Input
                        id="createPassword"
                        type={showCreatePassword ? "text" : "password"}
                        placeholder="••••••••••••••••"
                        value={createPassword}
                        onChange={(e) => setCreatePassword(e.target.value)}
                        className="bg-black/60 border-emerald-500/40 text-gray-100 placeholder:text-gray-600 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 transition-all font-mono pr-10 backdrop-blur-sm"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowCreatePassword(!showCreatePassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-emerald-400 transition"
                      >
                        {showCreatePassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2 group/field">
                    <Label htmlFor="createConfirmPassword" className="text-gray-300 flex items-center gap-2 font-mono text-sm">
                      <Lock className="w-4 h-4 text-cyan-400" />
                      CONFIRM PASSWORD
                    </Label>
                    <div className="relative">
                      <Input
                        id="createConfirmPassword"
                        type={showCreateConfirmPassword ? "text" : "password"}
                        placeholder="••••••••••••••••"
                        value={createConfirmPassword}
                        onChange={(e) => setCreateConfirmPassword(e.target.value)}
                        className="bg-black/60 border-emerald-500/40 text-gray-100 placeholder:text-gray-600 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 transition-all font-mono pr-10 backdrop-blur-sm"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowCreateConfirmPassword(!showCreateConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-emerald-400 transition"
                      >
                        {showCreateConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {createResult && (
                    <div
                      className={`p-3 rounded-lg border font-mono text-xs ${
                        createResult.success
                          ? "bg-emerald-950/20 border-emerald-500/30 text-emerald-300"
                          : "bg-red-950/20 border-red-500/30 text-red-300"
                      }`}
                    >
                      {createResult.message}
                    </div>
                  )}

                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setShowCreateAccount(false);
                        setCreateResult(null);
                      }}
                      className="flex-1 px-6 py-3 bg-gray-800/50 border border-gray-700 hover:border-gray-600 text-gray-400 hover:text-gray-300 rounded-lg transition-all font-mono text-sm"
                    >
                      CANCEL
                    </button>
                    <Button
                      type="submit"
                      disabled={createSubmitting}
                      className="flex-1 relative overflow-hidden bg-gradient-to-r from-emerald-600 via-cyan-600 to-emerald-600 hover:from-emerald-500 hover:via-cyan-500 hover:to-emerald-500 text-white shadow-lg shadow-emerald-500/30 transition-all duration-300 h-12 group/btn border border-emerald-400/30"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-1000"></div>
                      <span className="flex items-center justify-center gap-2 font-mono text-sm">
                        <Shield className="w-4 h-4" />
                        {createSubmitting ? "SUBMITTING..." : "SUBMIT REQUEST"}
                      </span>
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}