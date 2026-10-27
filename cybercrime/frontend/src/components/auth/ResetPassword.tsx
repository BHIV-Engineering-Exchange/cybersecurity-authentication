import { useState, useEffect } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { KeyRound, Lock, Eye, EyeOff, CheckCircle, XCircle, ArrowLeft } from "lucide-react";
import { apiUrl } from "@/lib/api";

interface ResetPasswordProps {
  setCurrentPage?: (page: string) => void;
}

export function ResetPassword({ setCurrentPage }: ResetPasswordProps) {
  const [email, setEmail] = useState("");
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    // Get email and token from URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const emailParam = urlParams.get("email");
    const tokenParam = urlParams.get("token");

    if (emailParam) {
      setEmail(emailParam);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setResult(null);

    // Validation
    if (!email || !oldPassword || !newPassword || !confirmPassword) {
      setResult({
        success: false,
        message: "Please fill in all fields"
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      setResult({
        success: false,
        message: "New password and confirm password do not match"
      });
      return;
    }

    if (newPassword.length < 8) {
      setResult({
        success: false,
        message: "New password must be at least 8 characters long"
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(apiUrl("investigators/reset-password"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.trim(),
          old_password: oldPassword,
          new_password: newPassword,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        setResult({
          success: true,
          message: "Password reset successfully! You can now login with your new password."
        });
        // Clear form
        setOldPassword("");
        setNewPassword("");
        setConfirmPassword("");
        // Redirect to login after 3 seconds
        setTimeout(() => {
          if (setCurrentPage) {
            setCurrentPage("investigator-login");
          } else {
            window.location.href = "/";
          }
        }, 3000);
      } else {
        setResult({
          success: false,
          message: data.detail || data.message || "Failed to reset password"
        });
      }
    } catch (error: any) {
      console.error("Error resetting password:", error);
      setResult({
        success: false,
        message: "Error connecting to server. Please try again."
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <div className="w-full max-w-md">
        {/* Back Button */}
        <button
          onClick={() => {
            if (setCurrentPage) {
              setCurrentPage("investigator-login");
            } else {
              window.location.href = "/";
            }
          }}
          className="flex items-center gap-2 text-gray-500 hover:text-emerald-400 transition mb-6 font-mono text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Login
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
                <KeyRound className="w-8 h-8 text-emerald-400" />
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full animate-pulse"></div>
              </div>
            </div>
          </div>

          <h1 className="text-5xl mb-3 bg-gradient-to-r from-emerald-400 via-cyan-400 to-emerald-500 bg-clip-text text-transparent">
            RESET PASSWORD
          </h1>
          <div className="h-1 w-32 mx-auto bg-gradient-to-r from-transparent via-emerald-400 to-transparent mb-3"></div>
          <p className="text-gray-400 flex items-center justify-center gap-2 font-mono">
            <Lock className="w-4 h-4 text-emerald-400" />
            Change your account password
          </p>
        </div>

        {/* Reset Form */}
        <div className="relative group">
          <div className="absolute -top-2 -left-2 w-8 h-8 border-t-2 border-l-2 border-emerald-400 opacity-50"></div>
          <div className="absolute -top-2 -right-2 w-8 h-8 border-t-2 border-r-2 border-cyan-400 opacity-50"></div>
          <div className="absolute -bottom-2 -left-2 w-8 h-8 border-b-2 border-l-2 border-cyan-400 opacity-50"></div>
          <div className="absolute -bottom-2 -right-2 w-8 h-8 border-b-2 border-r-2 border-emerald-400 opacity-50"></div>

          <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500 via-cyan-500 to-emerald-500 rounded-lg blur-lg opacity-30 group-hover:opacity-50 transition-opacity duration-500"></div>

          <div className="relative bg-gradient-to-br from-gray-900/95 via-black/95 to-gray-900/95 backdrop-blur-xl border border-emerald-500/30 rounded-lg shadow-2xl overflow-hidden p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Email (read-only if from URL) */}
              <div>
                <Label htmlFor="email" className="text-gray-300 font-mono mb-2 block">
                  Email Address
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="investigator@example.com"
                  required
                  className="bg-black/60 border-emerald-500/40 text-gray-100 placeholder:text-gray-600 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 transition-all font-mono"
                  disabled={!!new URLSearchParams(window.location.search).get("email")}
                />
              </div>

              {/* Old Password */}
              <div>
                <Label htmlFor="oldPassword" className="text-gray-300 font-mono mb-2 block">
                  Old Password (Generated Password from Email)
                </Label>
                <div className="relative">
                  <Input
                    id="oldPassword"
                    type={showOldPassword ? "text" : "password"}
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    placeholder="Enter the password you received via email"
                    required
                    className="bg-black/60 border-emerald-500/40 text-gray-100 placeholder:text-gray-600 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 transition-all font-mono pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowOldPassword(!showOldPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-emerald-400 transition"
                  >
                    {showOldPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div>
                <Label htmlFor="newPassword" className="text-gray-300 font-mono mb-2 block">
                  New Password
                </Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter your new password (min 8 characters)"
                    required
                    minLength={8}
                    className="bg-black/60 border-emerald-500/40 text-gray-100 placeholder:text-gray-600 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 transition-all font-mono pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-emerald-400 transition"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm New Password */}
              <div>
                <Label htmlFor="confirmPassword" className="text-gray-300 font-mono mb-2 block">
                  Confirm New Password
                </Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm your new password"
                    required
                    minLength={8}
                    className="bg-black/60 border-emerald-500/40 text-gray-100 placeholder:text-gray-600 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 transition-all font-mono pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-emerald-400 transition"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Result Message */}
              {result && (
                <div className={`p-4 rounded-lg border ${result.success
                    ? "bg-emerald-950/20 border-emerald-500/30"
                    : "bg-red-950/20 border-red-500/30"
                  }`}>
                  <div className="flex items-start gap-3">
                    {result.success ? (
                      <CheckCircle className="w-5 h-5 text-emerald-400 mt-0.5" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-400 mt-0.5" />
                    )}
                    <p className={`font-mono text-sm ${result.success ? "text-emerald-400" : "text-red-400"
                      }`}>
                      {result.message}
                    </p>
                  </div>
                </div>
              )}

              <Button
                type="submit"
                disabled={loading}
                className="w-full relative overflow-hidden bg-gradient-to-r from-emerald-600 via-cyan-600 to-emerald-600 hover:from-emerald-500 hover:via-cyan-500 hover:to-emerald-500 text-white shadow-lg shadow-emerald-500/30 transition-all duration-300 h-12 group/btn border border-emerald-400/30"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-1000"></div>
                {loading ? (
                  <span className="flex items-center justify-center gap-2 font-mono">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    Resetting...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2 font-mono">
                    <KeyRound className="w-4 h-4" />
                    Reset Password
                  </span>
                )}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
