import { useState, useEffect } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Shield, Lock, Mail, Terminal, AlertTriangle, Eye, EyeOff, Users, Activity, FolderOpen, CheckCircle } from "lucide-react";
import { apiUrl } from "@/lib/api";

export function InvestigatorLoginForm() {
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
      console.log("Investigator login attempted with:", { email, password });
    }, 2000);
  };

  return (
    <div className="w-full max-w-md">
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
          </div>
        </div>
      </div>

      {/* Request Access Section */}
      <div className="mt-6 pt-6 border-t border-emerald-500/20">
        <div className="text-center">
          <RequestAccessButton />
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
  );
}

function RequestAccessButton() {
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    reason: "",
    requested_password: "",
    confirm_password: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Validate form data
    if (!formData.full_name.trim() || !formData.email.trim() || !formData.requested_password.trim() || !formData.confirm_password.trim()) {
      setSubmitStatus("error");
      setErrorMessage("Please fill in all required fields.");
      return;
    }
    if (formData.requested_password.trim().length < 8) {
      setSubmitStatus("error");
      setErrorMessage("Password must be at least 8 characters long.");
      return;
    }
    if (formData.requested_password !== formData.confirm_password) {
      setSubmitStatus("error");
      setErrorMessage("Password and confirm password do not match.");
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus("idle");
    setErrorMessage("");

    try {
      console.log("Submitting access request:", formData);

      const response = await fetch(apiUrl("access-requests/request"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          full_name: formData.full_name.trim(),
          email: formData.email.trim().toLowerCase(),
          reason: formData.reason.trim() || null,
          requested_password: formData.requested_password,
        }),
      });

      let responseData;
      try {
        responseData = await response.json();
      } catch (jsonError) {
        // If response is not JSON, read as text
        const textResponse = await response.text();
        console.error("Non-JSON response:", textResponse);
        throw new Error(`Server error: ${response.status} ${response.statusText}`);
      }

      if (response.ok) {
        setSubmitStatus("success");
        setFormData({ full_name: "", email: "", reason: "", requested_password: "", confirm_password: "" });
        console.log("Access request submitted successfully:", responseData);

        // Show success message for 3 seconds before closing
        setTimeout(() => {
          setShowModal(false);
          setSubmitStatus("idle");
          setErrorMessage("");
        }, 3000);
      } else {
        setSubmitStatus("error");
        const errorMsg = responseData.detail || responseData.message || `Failed to submit request (${response.status})`;
        setErrorMessage(errorMsg);
        console.error("Error submitting request:", responseData);
      }
    } catch (error: any) {
      setSubmitStatus("error");
      const errorMsg = error.message || "Network error. Please check your connection and try again.";
      setErrorMessage(errorMsg);
      console.error("Network error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          console.log("Request access button clicked");
          setShowModal(true);
        }}
        className="group/create relative w-full px-6 py-3 bg-gradient-to-r from-gray-900/60 to-black/60 border border-emerald-500/30 hover:border-emerald-400/60 rounded-lg transition-all duration-300 overflow-hidden cursor-pointer"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 opacity-0 group-hover/create:opacity-100 transition-opacity"></div>
        <span className="relative flex items-center justify-center gap-2 text-emerald-400 font-mono text-sm">
          <Users className="w-4 h-4" />
          REQUEST INVESTIGATOR ACCESS
        </span>
      </button>

      {showModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gradient-to-br from-gray-900/95 to-black/95 backdrop-blur-xl border border-emerald-500/30 rounded-lg shadow-2xl max-w-md w-full p-6 relative">
            <button
              onClick={() => {
                setShowModal(false);
                setSubmitStatus("idle");
                setErrorMessage("");
              }}
              className="absolute top-4 right-4 text-gray-400 hover:text-emerald-400 transition"
            >
              <span className="text-2xl">×</span>
            </button>

            <h2 className="text-2xl font-mono text-emerald-400 mb-4">Request Investigator Access</h2>
            <p className="text-gray-400 text-sm font-mono mb-6">
              Submit your request for investigator access. A superadmin will review and approve your request.
            </p>

            {submitStatus === "success" ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-emerald-400" />
                </div>
                <p className="text-emerald-400 font-mono">Request submitted successfully!</p>
                <p className="text-gray-500 text-sm font-mono mt-2">You will be notified once your request is reviewed.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="full_name" className="text-gray-300 font-mono text-sm mb-2 block">
                    Full Name
                  </Label>
                  <Input
                    id="full_name"
                    type="text"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    className="bg-black/60 border-emerald-500/40 text-gray-100 font-mono"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="request_email" className="text-gray-300 font-mono text-sm mb-2 block">
                    Email Address
                  </Label>
                  <Input
                    id="request_email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="bg-black/60 border-emerald-500/40 text-gray-100 font-mono"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="reason" className="text-gray-300 font-mono text-sm mb-2 block">
                    Reason for Access (Optional)
                  </Label>
                  <textarea
                    id="reason"
                    value={formData.reason}
                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                    className="w-full bg-black/60 border border-emerald-500/40 text-gray-100 font-mono rounded-lg p-3 min-h-[100px] resize-none"
                    placeholder="Briefly explain why you need investigator access..."
                  />
                </div>
                <div>
                  <Label htmlFor="requested_password" className="text-gray-300 font-mono text-sm mb-2 block">
                    Password
                  </Label>
                  <Input
                    id="requested_password"
                    type="password"
                    value={formData.requested_password}
                    onChange={(e) => setFormData({ ...formData, requested_password: e.target.value })}
                    className="bg-black/60 border-emerald-500/40 text-gray-100 font-mono"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="confirm_password" className="text-gray-300 font-mono text-sm mb-2 block">
                    Confirm Password
                  </Label>
                  <Input
                    id="confirm_password"
                    type="password"
                    value={formData.confirm_password}
                    onChange={(e) => setFormData({ ...formData, confirm_password: e.target.value })}
                    className="bg-black/60 border-emerald-500/40 text-gray-100 font-mono"
                    required
                  />
                </div>

                {submitStatus === "error" && (
                  <div className="p-3 bg-red-500/20 border border-red-500/40 rounded-lg">
                    <p className="text-red-400 text-sm font-mono">{errorMessage}</p>
                  </div>
                )}

                <div className="flex gap-3">
                  <Button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      setSubmitStatus("idle");
                      setErrorMessage("");
                    }}
                    className="flex-1 bg-gray-800/60 border border-gray-700/40 text-gray-300 hover:bg-gray-700/60 font-mono"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white font-mono"
                  >
                    {isSubmitting ? "Submitting..." : "Submit Request"}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
