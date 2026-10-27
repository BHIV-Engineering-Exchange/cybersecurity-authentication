import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { Shield, FileText, Upload, FolderOpen, Brain, Phone, LogOut, Menu, X, Activity, User, RefreshCw, Bot, AlertTriangle, UploadCloud, Check, Lock, Search, Download, Calendar, Clock, Eye, EyeOff, BarChart3, Clipboard, MapPin, Mail, PhoneCall, Filter, MoreVertical, KeyRound, CheckCircle, XCircle, Bell, ChevronDown, Send, TrendingUp, Target, Award, Loader2 } from "lucide-react";
import { ttsService } from "@/utils/textToSpeech";
import { TextToSpeechIconButton } from "../ui/TextToSpeechButton";
import { TTSPageButton } from "../ui/TTSPageButton";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "../ui/chart";
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid } from "recharts";
import { IncidentReportDisplay } from "./IncidentReportDisplay";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { apiUrl, getAuthHeaders } from "@/lib/api";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";

interface InvestigatorDashboardProps {
  setCurrentPage: (page: "landing" | "admin-login" | "investigator-login" | "admin-dashboard" | "investigator-dashboard") => void;
}

type InvestigatorSection =
  | "incident-report"
  | "evidence-upload"
  | "evidence-library"
  | "ai-analysis"
  | "contact-police"
  | "complaint-history"
  | "messages"
  | "reset-password"
  | "my-dashboard";

export function InvestigatorDashboard({ setCurrentPage }: InvestigatorDashboardProps) {
  const [activeSection, setActiveSection] = useState<InvestigatorSection>("my-dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [evidenceWalletFilter, setEvidenceWalletFilter] = useState("");
  const [investigatorEmail, setInvestigatorEmail] = useState<string>("");
  const [investigatorName, setInvestigatorName] = useState<string>("");
  const [investigatorId, setInvestigatorId] = useState<number | null>(null);
  const [unreadCount, setUnreadCount] = useState<number>(0);

  useEffect(() => {
    // Get logged-in investigator email from localStorage
    const email = localStorage.getItem("investigator_email") || localStorage.getItem("admin_email") || "";
    setInvestigatorEmail(email);

    // Fetch current user information
    const fetchUserInfo = async () => {
      const token = localStorage.getItem("investigator_token") || localStorage.getItem("admin_token");
      if (!token) {
        return;
      }

      try {
        const response = await fetch(apiUrl("auth/me"), {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        if (response.ok) {
          const userData = await response.json();
          setInvestigatorId(userData.id || null);
          if (userData.full_name && userData.full_name.trim() !== "" && userData.full_name !== "Investigator") {
            setInvestigatorName(userData.full_name);
          } else if (userData.email) {
            // If no full_name or it's the default "Investigator", use email username as fallback
            const emailUsername = userData.email.split("@")[0];
            // Capitalize first letter
            setInvestigatorName(emailUsername.charAt(0).toUpperCase() + emailUsername.slice(1));
          }
        } else if (response.status === 401) {
          // Token is invalid or expired - clear it silently
          localStorage.removeItem("investigator_token");
          localStorage.removeItem("admin_token");
          // Don't log or show error - this is expected when tokens expire
          // The 401 error in console is normal and can be ignored
        }
      } catch (error) {
        // Silently handle network errors - don't log expected failures
        // The browser will show network errors in console, but we don't need to log them again
      }
    };

    fetchUserInfo();
  }, []);

  // Fetch unread message count
  useEffect(() => {
    if (!investigatorId) return;

    const fetchUnreadCount = async () => {
      try {
        const token = localStorage.getItem("investigator_token") || localStorage.getItem("access_token");
        const headers: HeadersInit = {};
        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
        }
        const response = await fetch(
          apiUrl(`messages/investigators/${investigatorId}/unread-count`),
          { headers }
        );
        if (response.ok) {
          const data = await response.json();
          setUnreadCount(data.unread_count || 0);
        }
      } catch (error) {
        console.error("Error fetching unread count:", error);
      }
    };

    fetchUnreadCount();
    // Refresh every 30 seconds
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [investigatorId]);

  const handleLogout = () => {
    localStorage.removeItem("investigator_token");
    localStorage.removeItem("investigator_email");
    setCurrentPage("landing");
  };

  const navigationItems = [
    { id: "my-dashboard" as InvestigatorSection, label: "My Dashboard", icon: BarChart3, color: "cyan" },
    { id: "incident-report" as InvestigatorSection, label: "Incident Report", icon: FileText, color: "emerald" },
    { id: "evidence-upload" as InvestigatorSection, label: "Evidence Upload", icon: Upload, color: "cyan" },
    { id: "evidence-library" as InvestigatorSection, label: "Evidence Library", icon: FolderOpen, color: "emerald" },
    { id: "ai-analysis" as InvestigatorSection, label: "AI Analysis History", icon: Brain, color: "cyan" },
    { id: "contact-police" as InvestigatorSection, label: "File Complaint", icon: Phone, color: "emerald" },
    { id: "complaint-history" as InvestigatorSection, label: "Complaint History", icon: Clipboard, color: "cyan" },
    { id: "messages" as InvestigatorSection, label: "Messages", icon: Mail, color: "purple" },
    { id: "reset-password" as InvestigatorSection, label: "Reset Password", icon: KeyRound, color: "yellow" },
  ];

  return (
    <div className="flex h-screen bg-black overflow-hidden">
      {/* Sidebar */}
      <div
        className={`${sidebarOpen ? "w-72" : "w-0"
          } transition-all duration-300 bg-gradient-to-b from-gray-900/95 via-black/95 to-gray-900/95 backdrop-blur-xl border-r border-emerald-500/30 flex flex-col relative overflow-hidden`}
      >
        {/* Circuit pattern */}
        <div className="absolute inset-0 opacity-5">
          <svg className="w-full h-full">
            <pattern id="circuit-sidebar" x="0" y="0" width="100" height="100" patternUnits="userSpaceOnUse">
              <circle cx="50" cy="50" r="2" fill="#10b981" />
              <line x1="50" y1="50" x2="100" y2="50" stroke="#10b981" strokeWidth="0.5" />
              <line x1="50" y1="50" x2="50" y2="0" stroke="#22d3ee" strokeWidth="0.5" />
            </pattern>
            <rect width="100%" height="100%" fill="url(#circuit-sidebar)" />
          </svg>
        </div>

        {sidebarOpen && (
          <>
            {/* Header */}
            <div className="relative p-6 border-b border-emerald-500/20">
              <div className="flex items-center gap-3 mb-4">
                <div className="relative">
                  <div className="p-2 bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 rounded-lg border border-emerald-500/30">
                    <Shield className="w-6 h-6 text-emerald-400" />
                  </div>
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full animate-pulse"></div>
                </div>
                <div>
                  <h1 className="text-lg text-emerald-400 font-mono">
                    {investigatorName || "INVESTIGATOR"}
                  </h1>
                  <p className="text-xs text-gray-500 font-mono">Field Operations</p>
                  {investigatorEmail && (
                    <p className="text-xs text-cyan-400 font-mono mt-1 truncate" title={investigatorEmail}>
                      {investigatorEmail}
                    </p>
                  )}
                </div>
              </div>

              {/* User Info */}
              <div className="flex items-center gap-2 p-3 bg-gradient-to-r from-emerald-950/40 to-cyan-950/40 border border-emerald-500/30 rounded-lg">
                <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-cyan-500 rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-emerald-400 font-mono truncate">Agent Field</p>
                  <p className="text-xs text-gray-500 font-mono">Level 2 Access</p>
                </div>
                <div className="relative">
                  <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                  <div className="absolute inset-0 w-2 h-2 bg-emerald-400 rounded-full animate-ping"></div>
                </div>
              </div>
            </div>

            {/* Navigation */}
            <nav className="relative flex-1 p-4 space-y-2 overflow-y-auto">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeSection === item.id;
                const showBadge = item.id === "messages" && unreadCount > 0;
                const isDashboard = item.id === "my-dashboard";
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveSection(item.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 font-mono text-sm group relative overflow-hidden ${
                      isActive
                        ? isDashboard
                          ? "bg-gradient-to-r from-cyan-500/20 to-emerald-500/20 border border-cyan-500/40 text-cyan-400"
                          : "bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 border border-emerald-500/40 text-emerald-400"
                        : "text-gray-400 hover:text-emerald-400 hover:bg-emerald-500/10 border border-transparent"
                    }`}
                  >
                    {isActive && (
                      <div className={`absolute inset-0 animate-pulse ${
                        isDashboard
                          ? "bg-gradient-to-r from-cyan-500/10 to-emerald-500/10"
                          : "bg-gradient-to-r from-emerald-500/10 to-cyan-500/10"
                      }`}></div>
                    )}
                    <div className="relative">
                      <Icon className={`w-5 h-5 relative z-10 ${
                        isActive
                          ? isDashboard
                            ? "text-cyan-400"
                            : "text-emerald-400"
                          : "text-gray-500 group-hover:text-cyan-400"
                      }`} />
                      {showBadge && (
                        <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-xs text-white font-bold z-20 border-2 border-black">
                          {unreadCount > 9 ? "9+" : unreadCount}
                        </span>
                      )}
                    </div>
                    <span className={`relative z-10 flex-1 text-left ${isDashboard && isActive ? "font-semibold" : ""}`}>
                      {item.label}
                    </span>
                    {isActive && (
                      <div className={`absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 rounded-r ${
                        isDashboard
                          ? "bg-gradient-to-b from-cyan-400 to-emerald-400"
                          : "bg-gradient-to-b from-emerald-400 to-cyan-400"
                      }`}></div>
                    )}
                  </button>
                );
              })}
            </nav>

            {/* Footer */}
            <div className="relative p-4 border-t border-emerald-500/20 space-y-2">
              <div className="flex items-center justify-between text-xs text-gray-600 font-mono px-2">
                <span className="flex items-center gap-1">
                  <Activity className="w-3 h-3 text-emerald-400" />
                  ONLINE
                </span>
                <span className="text-emerald-400">v3.7.2</span>
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-red-900/20 to-orange-900/20 border border-red-500/30 hover:border-red-500/60 text-red-400 hover:text-red-300 rounded-lg transition-all font-mono text-sm group"
              >
                <LogOut className="w-4 h-4 group-hover:rotate-180 transition-transform duration-300" />
                LOGOUT
              </button>
            </div>
          </>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <div className="bg-gradient-to-r from-gray-900/95 via-black/95 to-gray-900/95 backdrop-blur-xl border-b border-emerald-500/30 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2 text-gray-400 hover:text-emerald-400 transition hover:bg-emerald-500/10 rounded-lg"
              >
                {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
              <div>
                <h2 className="text-xl text-emerald-400 font-mono">Investigator Dashboard</h2>
                <p className="text-xs text-gray-500 font-mono">Field Agent Operations</p>
              </div>
            </div>

            {/* Status indicators */}
            <div className="flex items-center gap-4">
              {/* Notification Bell with Dropdown */}
              {investigatorId && (
                <NotificationBell
                  investigatorId={investigatorId}
                  unreadCount={unreadCount}
                  onViewMessages={() => setActiveSection("messages")}
                />
              )}
              
              <TTSPageButton />

              <div className="flex items-center gap-2 px-3 py-2 bg-emerald-950/40 border border-emerald-500/30 rounded-lg">
                <div className="relative">
                  <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                  <div className="absolute inset-0 w-2 h-2 bg-emerald-400 rounded-full animate-ping"></div>
                </div>
                <span className="text-xs text-emerald-400 font-mono">SYSTEM ACTIVE</span>
              </div>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeSection === "incident-report" && <IncidentReportSection investigatorId={investigatorId} />}
          {activeSection === "evidence-upload" && <EvidenceUploadSection />}
          {activeSection === "evidence-library" && (
            <EvidenceLibrarySection walletFilter={evidenceWalletFilter} />
          )}
          {activeSection === "ai-analysis" && <AIAnalysisSection />}
          {activeSection === "contact-police" && (
            <ContactPoliceSection
              investigatorId={investigatorId}
              onUseWalletForEvidence={(walletId: string) => {
                setEvidenceWalletFilter(walletId);
              }}
            />
          )}
          {activeSection === "complaint-history" && <ComplaintHistorySection />}
          {activeSection === "messages" && investigatorId && (
            <MessagesSection
              investigatorId={investigatorId}
              onMarkAsRead={() => {
                // Refresh unread count when message is marked as read
                if (investigatorId) {
                  const token = localStorage.getItem("investigator_token") || localStorage.getItem("access_token");
                  const headers: HeadersInit = {};
                  if (token) {
                    headers["Authorization"] = `Bearer ${token}`;
                  }
                  fetch(apiUrl(`messages/investigators/${investigatorId}/unread-count`), { headers })
                    .then(res => res.json())
                    .then(data => setUnreadCount(data.unread_count || 0))
                    .catch(console.error);
                }
              }}
            />
          )}
          {activeSection === "my-dashboard" && investigatorId && (
            <InvestigatorSelfServiceDashboard investigatorId={investigatorId} />
          )}
          {activeSection === "reset-password" && <ResetPasswordSection />}
        </div>
      </div>
    </div>
  );
}

// Section Components
function IncidentReportSection({ investigatorId }: { investigatorId: number | null }) {
  const [walletAddress, setWalletAddress] = useState("");
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reportData, setReportData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const maxCharacters = 500;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      // Get authentication token
      const token = localStorage.getItem("investigator_token") || localStorage.getItem("access_token");
      
      const headers: HeadersInit = {
        "Content-Type": "application/json",
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await fetch(apiUrl("incidents/analyze"), {
        method: "POST",
        headers: headers,
        body: JSON.stringify({
          wallet_address: walletAddress,
          description: reason,
          investigator_id: investigatorId,  // Will be overridden by backend if authenticated investigator
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to analyze wallet");
      }

      const data = await response.json();
      setReportData(data);
    } catch (err: any) {
      setError(err.message || "An error occurred while analyzing the wallet");
      console.error("Error:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl space-y-6">
      {/* Header Info */}
      <div className="bg-gradient-to-br from-gray-900/80 to-black/80 backdrop-blur-xl border border-emerald-500/30 rounded-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-gradient-to-br from-emerald-500/20 to-red-500/20 rounded-lg border border-emerald-500/30">
            <FileText className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg text-emerald-400 font-mono">Incident Report</h3>
            <p className="text-xs text-gray-500 font-mono">AI-powered wallet analysis and fraud detection</p>
          </div>
          <TextToSpeechIconButton
            text="Incident Report. AI-powered wallet analysis and fraud detection. Enter wallet address and get detailed AI-powered fraud analysis."
            className="ml-2"
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-start gap-3 p-4 bg-gradient-to-r from-emerald-950/20 to-red-950/20 border border-emerald-500/20 rounded-lg">
            <div className="p-2 bg-emerald-500/10 rounded-lg border border-emerald-500/30">
              <Bot className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <p className="text-sm text-emerald-400 font-mono mb-1">AI Analysis</p>
              <p className="text-xs text-gray-400 font-mono">Enter wallet address and get detailed AI-powered fraud analysis</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-4 bg-gradient-to-r from-emerald-950/20 to-red-950/20 border border-emerald-500/20 rounded-lg">
            <div className="p-2 bg-red-500/10 rounded-lg border border-red-500/30">
              <AlertTriangle className="w-4 h-4 text-red-400" />
            </div>
            <div>
              <p className="text-sm text-red-400 font-mono mb-1">Fraud Detection</p>
              <p className="text-xs text-gray-400 font-mono">Identify suspicious patterns and potential criminal activity</p>
            </div>
          </div>
        </div>
      </div>

      {/* Report Form */}
      <div className="bg-gradient-to-br from-gray-900/80 to-black/80 backdrop-blur-xl border border-emerald-500/30 rounded-lg p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Wallet ID Field */}
          <div className="space-y-2">
            <Label htmlFor="walletAddress" className="text-gray-300 flex items-center gap-2 font-mono text-sm">
              <span className="text-xl">🔗</span>
              Wallet ID (Origin or Destination)
            </Label>
            <Input
              id="walletAddress"
              type="text"
              placeholder="Paste nameOrig/nameDest or wallet address"
              value={walletAddress}
              onChange={(e) => setWalletAddress(e.target.value)}
              className="bg-black/60 border-emerald-500/40 text-gray-100 placeholder:text-gray-600 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 transition-all font-mono"
              required
            />
            <p className="text-[11px] text-gray-500 font-mono">
              Tip: You can paste Origin/Transfer IDs from AI Fraud Detection (nameOrig/nameDest).
            </p>
          </div>

          {/* Reason for Reporting */}
          <div className="space-y-2">
            <Label htmlFor="reason" className="text-gray-300 flex items-center gap-2 font-mono text-sm">
              <span className="text-xl">📝</span>
              Reason for Reporting
            </Label>
            <Textarea
              id="reason"
              placeholder="Describe the suspicious activity in detail..."
              value={reason}
              onChange={(e) => {
                if (e.target.value.length <= maxCharacters) {
                  setReason(e.target.value);
                }
              }}
              className="bg-black/60 border-emerald-500/40 text-gray-100 placeholder:text-gray-600 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 transition-all font-mono min-h-[120px] resize-none"
              required
            />
            <div className="flex justify-end">
              <span className={`text-xs font-mono ${reason.length >= maxCharacters ? 'text-red-400' : 'text-gray-500'}`}>
                {reason.length}/{maxCharacters}
              </span>
            </div>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full relative overflow-hidden bg-gradient-to-r from-red-600 via-orange-600 to-red-600 hover:from-red-500 hover:via-orange-500 hover:to-red-500 text-white shadow-lg shadow-red-500/30 transition-all duration-300 h-12 group/btn border border-red-400/30"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-1000"></div>
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-2 font-mono">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                ANALYZING...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2 font-mono">
                <span className="text-xl">🚨</span>
                Submit Report & Analyze with AI
                <span className="text-xl">🤖</span>
              </span>
            )}
          </Button>
        </form>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-950/40 border border-red-500/50 rounded-lg p-4">
          <div className="flex items-center gap-2 text-red-400 font-mono">
            <AlertTriangle className="w-5 h-5" />
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Report Results */}
      {reportData ? (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl text-emerald-400 font-mono">Investigation Report</h2>
            <Button
              onClick={() => {
                setReportData(null);
                setWalletAddress("");
                setReason("");
              }}
              className="bg-gray-800 border border-gray-600 text-gray-300 hover:text-white font-mono text-sm"
            >
              New Report
            </Button>
          </div>
          <IncidentReportDisplay reportData={reportData} />
        </div>
      ) : (
        /* Empty State - Only show when no report data */
        <div className="bg-gradient-to-br from-gray-900/80 to-black/80 backdrop-blur-xl border border-emerald-500/30 rounded-lg p-6">
          <div className="p-8 bg-gradient-to-r from-emerald-950/20 to-cyan-950/20 border border-emerald-500/20 rounded-lg text-center">
            <div className="flex flex-col items-center gap-3">
              <AlertTriangle className="w-12 h-12 text-gray-600" />
              <p className="text-gray-500 font-mono">No incident reports found</p>
              <p className="text-xs text-gray-600 font-mono">Submit a report above to see analysis results</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function EvidenceUploadSection() {
  const [walletId, setWalletId] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [riskLevel, setRiskLevel] = useState("medium");
  const [files, setFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    setFiles((prev) => [...prev, ...droppedFiles]);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      setFiles((prev) => [...prev, ...selectedFiles]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (files.length === 0) {
      setUploadError("Please select at least one file to upload");
      return;
    }

    if (!walletId.trim()) {
      setUploadError("Please enter a Wallet ID");
      return;
    }

    setIsUploading(true);
    setUploadError(null);
    setUploadSuccess(null);

    try {
      // Get authentication token
      const token = localStorage.getItem("investigator_token") || localStorage.getItem("access_token");
      
      let successCount = 0;
      let errorCount = 0;
      let firstError: string | null = null;

      for (const file of files) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("wallet_id", walletId.trim());
        formData.append("title", file.name);
        formData.append("description", description.trim());
        formData.append("tags", tags.trim());
        formData.append("risk_level", riskLevel);

        const headers: HeadersInit = {};
        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
        }

        try {
          console.log(`Uploading file: ${file.name}, size: ${file.size} bytes`);
          console.log(`Wallet ID: ${walletId.trim()}, Has token: ${!!token}`);
          
          const response = await fetch(apiUrl("evidence/"), {
            method: "POST",
            headers: headers,
            body: formData,
          });

          console.log(`Response status: ${response.status} ${response.statusText}`);

          if (response.ok) {
            const result = await response.json();
            console.log(`Successfully uploaded ${file.name}:`, result);
            successCount++;
          } else {
            let errorText = "";
            try {
              const errorData = await response.json();
              errorText = errorData.detail || errorData.message || `HTTP ${response.status}`;
              console.error(`Failed to upload ${file.name} - JSON error:`, errorData);
            } catch (parseError) {
              const textResponse = await response.text();
              errorText = textResponse || `HTTP ${response.status}: ${response.statusText}`;
              console.error(`Failed to upload ${file.name} - Text error:`, textResponse);
            }
            if (!firstError) {
              firstError = `Failed to upload ${file.name}: ${errorText}`;
            }
            errorCount++;
          }
        } catch (error: any) {
          console.error(`Network error uploading ${file.name}:`, error);
          if (!firstError) {
            firstError = `Network error uploading ${file.name}: ${error.message || "Please check your connection and ensure the backend is running"}`;
          }
          errorCount++;
        }
      }

      if (successCount > 0) {
        setUploadSuccess(`Successfully uploaded ${successCount} file(s)${errorCount > 0 ? ` (${errorCount} failed)` : ""}. Superadmin has been notified.`);
        // Reset form after successful upload
        setWalletId("");
        setDescription("");
        setTags("");
        setRiskLevel("medium");
        setFiles([]);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
        // Clear success message after 5 seconds
        setTimeout(() => setUploadSuccess(null), 5000);
      } else {
        // Show the first error message captured
        setUploadError(firstError || `Failed to upload ${errorCount} file(s). Please check the console for details.`);
      }
    } catch (error: any) {
      console.error("Error uploading evidence", error);
      setUploadError(error.message || "An error occurred while uploading files. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case "low":
        return "text-green-400 border-green-500/40";
      case "medium":
        return "text-yellow-400 border-yellow-500/40";
      case "high":
        return "text-orange-400 border-orange-500/40";
      case "critical":
        return "text-red-400 border-red-500/40";
      default:
        return "text-gray-400 border-gray-500/40";
    }
  };

  return (
    <div className="max-w-4xl space-y-6">
      {/* Header Info */}
      <div className="bg-gradient-to-br from-gray-900/80 to-black/80 backdrop-blur-xl border border-cyan-500/30 rounded-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-gradient-to-br from-cyan-500/20 to-emerald-500/20 rounded-lg border border-cyan-500/30">
            <UploadCloud className="w-5 h-5 text-cyan-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg text-cyan-400 font-mono">Evidence Upload</h3>
            <p className="text-xs text-gray-500 font-mono">Securely upload and manage case evidence files</p>
          </div>
          <TextToSpeechIconButton
            text="Evidence Upload. Securely upload and manage case evidence files. Upload files linked to your assigned cases. Add descriptions or notes for each file. Files stored with hash and timestamp for authenticity."
            className="ml-2"
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-start gap-3 p-4 bg-gradient-to-r from-cyan-950/20 to-emerald-950/20 border border-cyan-500/20 rounded-lg">
            <div className="p-2 bg-cyan-500/10 rounded-lg border border-cyan-500/30">
              <Upload className="w-4 h-4 text-cyan-400" />
            </div>
            <div>
              <p className="text-sm text-cyan-400 font-mono mb-1">Upload Files</p>
              <p className="text-xs text-gray-400 font-mono">Upload evidence linked to your assigned cases</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-4 bg-gradient-to-r from-cyan-950/20 to-emerald-950/20 border border-cyan-500/20 rounded-lg">
            <div className="p-2 bg-emerald-500/10 rounded-lg border border-emerald-500/30">
              <FileText className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <p className="text-sm text-emerald-400 font-mono mb-1">Add Context</p>
              <p className="text-xs text-gray-400 font-mono">Add descriptions or notes for each file</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-4 bg-gradient-to-r from-cyan-950/20 to-emerald-950/20 border border-cyan-500/20 rounded-lg">
            <div className="p-2 bg-yellow-500/10 rounded-lg border border-yellow-500/30">
              <Lock className="w-4 h-4 text-yellow-400" />
            </div>
            <div>
              <p className="text-sm text-yellow-400 font-mono mb-1">Secure Storage</p>
              <p className="text-xs text-gray-400 font-mono">Files stored with hash and timestamp for authenticity</p>
            </div>
          </div>
        </div>
      </div>

      {/* Upload Form */}
      <div className="bg-gradient-to-br from-gray-900/80 to-black/80 backdrop-blur-xl border border-cyan-500/30 rounded-lg p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Wallet ID Field */}
          <div className="space-y-2">
            <Label htmlFor="walletId" className="text-gray-300 font-mono text-sm">
              Wallet ID
            </Label>
            <Input
              id="walletId"
              type="text"
              placeholder="Enter wallet address"
              value={walletId}
              onChange={(e) => setWalletId(e.target.value)}
              className="bg-black/60 border-cyan-500/40 text-gray-100 placeholder:text-gray-600 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 transition-all font-mono"
              required
            />
          </div>

          {/* Description / Notes */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-gray-300 font-mono text-sm">
              Description / Notes
            </Label>
            <Textarea
              id="description"
              placeholder="Describe the evidence..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="bg-black/60 border-cyan-500/40 text-gray-100 placeholder:text-gray-600 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 transition-all font-mono min-h-[100px] resize-none"
              required
            />
          </div>

          {/* File Upload */}
          <div className="space-y-2">
            <Label className="text-gray-300 font-mono text-sm">File Upload</Label>
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all ${isDragging
                  ? "border-cyan-400 bg-cyan-500/10"
                  : "border-cyan-500/40 hover:border-cyan-400 bg-black/40"
                }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={handleFileSelect}
                className="hidden"
              />
              <div className="flex flex-col items-center gap-3">
                <div className="p-3 bg-gradient-to-br from-cyan-500/20 to-emerald-500/20 rounded-lg border border-cyan-500/30">
                  <UploadCloud className="w-8 h-8 text-cyan-400" />
                </div>
                <div>
                  <p className="text-cyan-400 font-mono mb-1">📁 Drop files here or click to upload</p>
                  <p className="text-sm text-gray-500">Any file type supported (Max 50MB per file)</p>
                  <p className="text-sm text-gray-500">You can upload multiple files at once</p>
                </div>
              </div>
            </div>

            {/* File List */}
            {files.length > 0 && (
              <div className="mt-3 space-y-2">
                {files.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-cyan-950/20 border border-cyan-500/30 rounded-lg"
                  >
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-cyan-400" />
                      <span className="text-sm text-gray-300 font-mono truncate">{file.name}</span>
                    </div>
                    <span className="text-xs text-gray-500 font-mono">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label htmlFor="tags" className="text-gray-300 font-mono text-sm">
              Tags (comma-separated)
            </Label>
            <Input
              id="tags"
              type="text"
              placeholder="fraud, suspicious, transaction"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              className="bg-black/60 border-cyan-500/40 text-gray-100 placeholder:text-gray-600 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 transition-all font-mono"
            />
          </div>

          {/* Risk Level */}
          <div className="space-y-2">
            <Label htmlFor="riskLevel" className="text-gray-300 font-mono text-sm">
              Risk Level
            </Label>
            <Select value={riskLevel} onValueChange={setRiskLevel}>
              <SelectTrigger className="bg-black/60 border-cyan-500/40 text-gray-100 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 transition-all font-mono">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-900 border-cyan-500/40">
                <SelectItem value="low" className="font-mono text-green-400 focus:bg-green-950/40 cursor-pointer">
                  Low Risk
                </SelectItem>
                <SelectItem value="medium" className="font-mono text-yellow-400 focus:bg-yellow-950/40 cursor-pointer">
                  Medium Risk
                </SelectItem>
                <SelectItem value="high" className="font-mono text-orange-400 focus:bg-orange-950/40 cursor-pointer">
                  High Risk
                </SelectItem>
                <SelectItem value="critical" className="font-mono text-red-400 focus:bg-red-950/40 cursor-pointer">
                  Critical Risk
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Success Message */}
          {uploadSuccess && (
            <div className="bg-green-950/40 border border-green-500/50 rounded-lg p-4">
              <div className="flex items-center gap-2 text-green-400 font-mono">
                <CheckCircle className="w-5 h-5" />
                <span>{uploadSuccess}</span>
              </div>
            </div>
          )}

          {/* Error Message */}
          {uploadError && (
            <div className="bg-red-950/40 border border-red-500/50 rounded-lg p-4">
              <div className="flex items-center gap-2 text-red-400 font-mono">
                <AlertTriangle className="w-5 h-5" />
                <span>{uploadError}</span>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={isUploading || files.length === 0}
            className="w-full relative overflow-hidden bg-gradient-to-r from-cyan-600 via-emerald-600 to-cyan-600 hover:from-cyan-500 hover:via-emerald-500 hover:to-cyan-500 text-white shadow-lg shadow-cyan-500/30 transition-all duration-300 h-12 group/btn border border-cyan-400/30 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-1000"></div>
            {isUploading ? (
              <span className="flex items-center justify-center gap-2 font-mono">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                UPLOADING...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2 font-mono">
                Upload {files.length} File(s)
              </span>
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}

function EvidenceLibrarySection({ walletFilter }: { walletFilter: string }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [fileType, setFileType] = useState("all");
  const [evidence, setEvidence] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEvidence = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("investigator_token") || localStorage.getItem("access_token");
      const headers: HeadersInit = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      const res = await fetch(apiUrl("evidence/"), { headers });
      if (res.ok) {
        const data = await res.json();
        setEvidence(data);
      }
    } catch (e) {
      console.error("Error fetching evidence", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvidence();
  }, []);

  useEffect(() => {
    if (walletFilter && walletFilter.trim()) {
      setSearchQuery(walletFilter.trim());
    }
  }, [walletFilter]);

  const inferFileType = (title: string): string => {
    const lower = (title || "").toLowerCase();
    if (lower.match(/\.(png|jpg|jpeg|gif|webp|bmp)$/)) return "image";
    if (lower.match(/\.(pdf|doc|docx|txt|rtf|ppt|pptx)$/)) return "document";
    if (lower.match(/\.(mp4|mov|avi|mkv|webm)$/)) return "video";
    return "other";
  };

  const parseFromDescription = (description: string | null | undefined) => {
    const result: { walletId: string; tags: string[] } = { walletId: "", tags: [] };
    if (!description) return result;
    const lines = description.split("\n");
    for (const line of lines) {
      if (line.startsWith("Wallet:")) {
        result.walletId = line.replace("Wallet:", "").trim();
      } else if (line.startsWith("Tags:")) {
        const tagsStr = line.replace("Tags:", "").trim();
        if (tagsStr) {
          result.tags = tagsStr.split(",").map((t) => t.trim()).filter(Boolean);
        }
      }
    }
    return result;
  };

  const mappedEvidence = evidence.map((item) => {
    const title = item.title || item.evidence_id || "Evidence";
    const createdAt = item.created_at ? new Date(item.created_at) : null;
    const uploadDate = createdAt
      ? createdAt.toLocaleDateString("en-GB")
      : "—";
    const uploadTime = createdAt
      ? createdAt.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
      : "—";
    const { walletId, tags } = parseFromDescription(item.description);
    const type = inferFileType(title);

    return {
      id: item.id,
      filename: title,
      walletId: walletId || "Unknown wallet",
      uploadDate,
      uploadTime,
      fileSize: "—",
      fileType: type,
      riskLevel: "medium",
      status: item.anchor_status || "pending",
      tags,
      hash: item.hash,
    };
  });

  const filteredEvidenceFiles = mappedEvidence.filter((file) => {
    const q = searchQuery.toLowerCase();
    const matchesType = fileType === "all" || file.fileType === fileType;
    const matchesSearch =
      !q ||
      file.filename.toLowerCase().includes(q) ||
      file.walletId.toLowerCase().includes(q) ||
      file.tags.some((t: string) => t.toLowerCase().includes(q));
    return matchesType && matchesSearch;
  });

  return (
    <div className="max-w-6xl space-y-6">
      {/* Header Info */}
      <div className="bg-gradient-to-br from-gray-900/80 to-black/80 backdrop-blur-xl border border-emerald-500/30 rounded-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 rounded-lg border border-emerald-500/30">
            <FolderOpen className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg text-emerald-400 font-mono">Evidence Library</h3>
            <p className="text-xs text-gray-500 font-mono">Comprehensive evidence management and tracking</p>
          </div>
          <TextToSpeechIconButton
            text="Evidence Library. Comprehensive evidence management and tracking. View Files. Browse and download all uploaded evidence files. Track Status. Monitor evidence status across all cases. ML Analysis. View ML analysis results for all cases. Audit Trail. Maintain clear audit trail of all actions."
            className="ml-2"
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="flex items-start gap-3 p-4 bg-gradient-to-r from-emerald-950/20 to-cyan-950/20 border border-emerald-500/20 rounded-lg">
            <div className="p-2 bg-emerald-500/10 rounded-lg border border-emerald-500/30">
              <Eye className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-emerald-400 font-mono mb-1">View Files</p>
              <p className="text-xs text-gray-400 font-mono">Browse and download all uploaded evidence files</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-4 bg-gradient-to-r from-emerald-950/20 to-cyan-950/20 border border-emerald-500/20 rounded-lg">
            <div className="p-2 bg-cyan-500/10 rounded-lg border border-cyan-500/30">
              <Activity className="w-4 h-4 text-cyan-400" />
            </div>
            <div>
              <p className="text-sm text-cyan-400 font-mono mb-1">Track Status</p>
              <p className="text-xs text-gray-400 font-mono">Monitor evidence status across all cases</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-4 bg-gradient-to-r from-emerald-950/20 to-cyan-950/20 border border-emerald-500/20 rounded-lg">
            <div className="p-2 bg-purple-500/10 rounded-lg border border-purple-500/30">
              <Brain className="w-4 h-4 text-purple-400" />
            </div>
            <div>
              <p className="text-sm text-purple-400 font-mono mb-1">ML Analysis</p>
              <p className="text-xs text-gray-400 font-mono">View ML analysis results for all cases</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-4 bg-gradient-to-r from-emerald-950/20 to-cyan-950/20 border border-emerald-500/20 rounded-lg">
            <div className="p-2 bg-yellow-500/10 rounded-lg border border-yellow-500/30">
              <FileText className="w-4 h-4 text-yellow-400" />
            </div>
            <div>
              <p className="text-sm text-yellow-400 font-mono mb-1">Audit Trail</p>
              <p className="text-xs text-gray-400 font-mono">Maintain clear audit trail of all actions</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-4 bg-gradient-to-r from-emerald-950/20 to-cyan-950/20 border border-emerald-500/20 rounded-lg">
            <div className="p-2 bg-blue-500/10 rounded-lg border border-blue-500/30">
              <FolderOpen className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-blue-400 font-mono mb-1">Management</p>
              <p className="text-xs text-gray-400 font-mono">Comprehensive evidence management tools</p>
            </div>
          </div>
        </div>
      </div>

      {/* View Only Badge and Search */}
      <div className="bg-gradient-to-br from-gray-900/80 to-black/80 backdrop-blur-xl border border-emerald-500/30 rounded-lg p-6 space-y-4">
        {/* View Only Badge */}
        <div className="flex items-center gap-2 w-fit px-4 py-2 bg-gradient-to-r from-gray-800/60 to-gray-900/60 border border-gray-600/40 rounded-lg">
          <Lock className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-400 font-mono">🔒 View Only</span>
        </div>

        {/* Search and Filter */}
        <div className="flex gap-4 flex-col sm:flex-row">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <Input
              type="text"
              placeholder="Search evidence files..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-black/60 border-emerald-500/40 text-gray-100 placeholder:text-gray-600 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 transition-all font-mono"
            />
          </div>

          {/* Filter */}
          <Select value={fileType} onValueChange={setFileType}>
            <SelectTrigger className="w-full sm:w-48 bg-black/60 border-emerald-500/40 text-gray-100 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 transition-all font-mono">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-gray-900 border-emerald-500/40">
              <SelectItem value="all" className="font-mono text-gray-300 focus:bg-emerald-950/40 cursor-pointer">
                All Types
              </SelectItem>
              <SelectItem value="image" className="font-mono text-gray-300 focus:bg-emerald-950/40 cursor-pointer">
                Images
              </SelectItem>
              <SelectItem value="document" className="font-mono text-gray-300 focus:bg-emerald-950/40 cursor-pointer">
                Documents
              </SelectItem>
              <SelectItem value="video" className="font-mono text-gray-300 focus:bg-emerald-950/40 cursor-pointer">
                Videos
              </SelectItem>
              <SelectItem value="other" className="font-mono text-gray-300 focus:bg-emerald-950/40 cursor-pointer">
                Other
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Evidence Files List */}
      <div className="bg-gradient-to-br from-gray-900/80 to-black/80 backdrop-blur-xl border border-emerald-500/30 rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <FolderOpen className="w-5 h-5 text-emerald-400" />
            <h3 className="text-lg text-emerald-400 font-mono">All Evidence Files</h3>
            <span className="px-2 py-1 bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 text-xs rounded font-mono">
              {mappedEvidence.length} {mappedEvidence.length === 1 ? "file" : "files"}
            </span>
          </div>
        </div>

        {/* Evidence File Card */}
        {loading ? (
          <div className="py-12 flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin" />
            <p className="text-gray-500 font-mono text-sm">Loading evidence files...</p>
          </div>
        ) : filteredEvidenceFiles.length === 0 ? (
          <div className="py-12 flex flex-col items-center gap-3">
            <div className="p-4 bg-gradient-to-br from-emerald-500/10 to-cyan-500/10 rounded-lg border border-emerald-500/20">
              <FolderOpen className="w-12 h-12 text-gray-600" />
            </div>
            <p className="text-gray-500 font-mono text-sm">No evidence files found</p>
            <p className="text-gray-600 text-xs font-mono">Upload evidence to see it listed here</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredEvidenceFiles.map((file) => (
              <div
                key={file.id}
                className="p-5 bg-gradient-to-r from-emerald-950/20 to-cyan-950/20 border border-emerald-500/30 rounded-lg hover:border-emerald-500/60 transition-all group"
              >
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <FileText className="w-5 h-5 text-emerald-400" />
                      <h4 className="text-gray-100 font-mono">{file.filename}</h4>
                      <span
                        className={`px-2 py-1 text-xs rounded font-mono ${file.riskLevel === "high"
                            ? "bg-orange-950/40 border border-orange-500/30 text-orange-400"
                            : file.riskLevel === "medium"
                              ? "bg-yellow-950/40 border border-yellow-500/30 text-yellow-400"
                              : "bg-green-950/40 border border-green-500/30 text-green-400"
                          }`}
                      >
                        {file.riskLevel.toUpperCase()} RISK
                      </span>
                      <span className="px-2 py-1 bg-cyan-950/40 border border-cyan-500/30 text-cyan-400 text-xs rounded font-mono">
                        {file.status.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-400 font-mono mb-3">Wallet: {file.walletId}</p>

                    {/* Tags */}
                    {file.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-3">
                        {file.tags.map((tag: string, index: number) => (
                          <span
                            key={index}
                            className="px-2 py-1 bg-gray-800/60 border border-gray-700/40 text-gray-400 text-xs rounded font-mono"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Metadata */}
                    <div className="flex flex-wrap gap-4 text-xs text-gray-500 font-mono">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {file.uploadDate}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {file.uploadTime}
                      </div>
                      <div className="flex items-center gap-1">
                        <FileText className="w-3 h-3" />
                        Hash: {file.hash ? `${file.hash.substring(0, 10)}...` : "N/A"}
                      </div>
                    </div>
                  </div>

                  {/* Download Button (placeholder – no storage yet) */}
                  <button className="p-3 bg-gradient-to-r from-emerald-950/40 to-cyan-950/40 border border-emerald-500/30 hover:border-emerald-500/60 text-emerald-400 hover:text-emerald-300 rounded-lg transition-all group/btn">
                    <Download className="w-5 h-5 group-hover/btn:translate-y-0.5 transition-transform" />
                  </button>
                </div>

                {/* Hash and Timestamp for Authenticity */}
                <div className="pt-3 border-t border-gray-700/40">
                  <div className="flex items-center gap-2 text-xs text-gray-600 font-mono">
                    <Lock className="w-3 h-3" />
                    <span>
                      Hash: {file.hash ? file.hash : "N/A"}
                    </span>
                    <span className="text-gray-700">|</span>
                    <span>
                      Recorded: {file.uploadDate} {file.uploadTime}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function WatchlistSection() {
  const [watchlist, setWatchlist] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [walletAddress, setWalletAddress] = useState("");
  const [label, setLabel] = useState("");
  const [batchLoading, setBatchLoading] = useState(false);
  const [analyzingId, setAnalyzingId] = useState<number | null>(null);

  const fetchWatchlist = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("investigator_token") || localStorage.getItem("access_token");
      const headers: HeadersInit = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      const res = await fetch(apiUrl("watchlist"), { headers });
      if (res.ok) {
        const data = await res.json();
        setWatchlist(data);
      }
    } catch (e) {
      console.error("Error fetching watchlist", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWatchlist();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!walletAddress.trim()) return;
    try {
      const token = localStorage.getItem("investigator_token") || localStorage.getItem("access_token");
      const headers: HeadersInit = {
        "Content-Type": "application/json",
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      const res = await fetch(
        apiUrl("watchlist"),
        {
          method: "POST",
          headers,
          body: JSON.stringify({
            wallet_address: walletAddress.trim(),
            label: label.trim() || null,
          }),
        }
      );
      if (res.ok) {
        setWalletAddress("");
        setLabel("");
        fetchWatchlist();
      } else {
        const errorData = await res.json().catch(() => ({}));
        console.error("Failed to add to watchlist:", res.status, errorData);
        alert(`Failed to add wallet: ${errorData.detail || "Unknown error"}`);
      }
    } catch (e) {
      console.error("Error adding to watchlist", e);
      alert("An error occurred while adding the wallet. Please try again.");
    }
  };

  const handleRemove = async (id: number) => {
    try {
      const token = localStorage.getItem("investigator_token") || localStorage.getItem("access_token");
      const headers: HeadersInit = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      const res = await fetch(
        apiUrl(`watchlist/${id}`),
        { method: "DELETE", headers }
      );
      if (res.ok) {
        setWatchlist((prev) => prev.filter((w) => w.id !== id));
      }
    } catch (e) {
      console.error("Error removing from watchlist", e);
    }
  };

  const handleAnalyzeOne = async (id: number) => {
    try {
      setAnalyzingId(id);
      const token = localStorage.getItem("investigator_token") || localStorage.getItem("access_token");
      const headers: HeadersInit = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      const res = await fetch(
        apiUrl(`watchlist/${id}/analyze`),
        { method: "POST", headers }
      );
      if (res.ok) {
        const updated = await res.json();
        setWatchlist((prev) =>
          prev.map((w) => (w.id === id ? { ...w, ...updated } : w))
        );
      }
    } catch (e) {
      console.error("Error analyzing watchlist wallet", e);
    } finally {
      setAnalyzingId(null);
    }
  };

  const handleBatchAnalyze = async () => {
    try {
      setBatchLoading(true);
      const token = localStorage.getItem("investigator_token") || localStorage.getItem("access_token");
      const headers: HeadersInit = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      const res = await fetch(
        apiUrl("watchlist/batch-analyze"),
        { method: "POST", headers }
      );
      if (res.ok) {
        const data = await res.json();
        // Merge updated monitoring info back into list
        const byId: Record<number, any> = {};
        for (const item of data.items ?? []) {
          byId[item.id] = item;
        }
        setWatchlist((prev) =>
          prev.map((w) =>
            byId[w.id] ? { ...w, ...byId[w.id] } : w
          )
        );
      }
    } catch (e) {
      console.error("Error batch analyzing watchlist", e);
    } finally {
      setBatchLoading(false);
    }
  };

  const formatDateTime = (value?: string | null) => {
    if (!value) return "—";
    try {
      const d = new Date(value);
      return d.toLocaleString("en-US", {
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return value;
    }
  };

  return (
    <div className="max-w-6xl space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-br from-gray-900/80 to-black/80 backdrop-blur-xl border border-emerald-500/30 rounded-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 rounded-lg border border-emerald-500/30">
            <Shield className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg text-emerald-400 font-mono">Watchlist & Monitoring</h3>
            <p className="text-xs text-gray-500 font-mono">Track and monitor high-risk wallets continuously</p>
          </div>
          <TextToSpeechIconButton
            text="Watchlist and Monitoring. Track and monitor high-risk wallets continuously. Save to Watchlist. Add high-risk wallets for quick re-analysis. Batch Analysis. Run analysis on all wallets to generate reports. Real-time Status. View latest risk scores and check times."
            className="ml-2"
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-start gap-3 p-4 bg-gradient-to-r from-emerald-950/20 to-cyan-950/20 border border-emerald-500/20 rounded-lg">
            <div className="p-2 bg-emerald-500/10 rounded-lg border border-emerald-500/30">
              <Shield className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-emerald-400 font-mono mb-1">Save to Watchlist</p>
              <p className="text-xs text-gray-400 font-mono">Add high-risk wallets for quick re-analysis</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-4 bg-gradient-to-r from-emerald-950/20 to-cyan-950/20 border border-emerald-500/20 rounded-lg">
            <div className="p-2 bg-cyan-500/10 rounded-lg border border-cyan-500/30">
              <RefreshCw className="w-4 h-4 text-cyan-400" />
            </div>
            <div>
              <p className="text-sm text-cyan-400 font-mono mb-1">Batch Analysis</p>
              <p className="text-xs text-gray-400 font-mono">Run analysis on all wallets to generate reports</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-4 bg-gradient-to-r from-emerald-950/20 to-cyan-950/20 border border-emerald-500/20 rounded-lg">
            <div className="p-2 bg-yellow-500/10 rounded-lg border border-yellow-500/30">
              <Activity className="w-4 h-4 text-yellow-400" />
            </div>
            <div>
              <p className="text-sm text-yellow-400 font-mono mb-1">Real-time Status</p>
              <p className="text-xs text-gray-400 font-mono">View latest risk scores and check times</p>
            </div>
          </div>
        </div>
      </div>

      {/* Add to Watchlist */}
      <div className="bg-gradient-to-br from-gray-900/80 to-black/80 backdrop-blur-xl border border-emerald-500/30 rounded-lg p-6 space-y-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-emerald-400" />
            <h3 className="text-lg text-emerald-400 font-mono">Watchlist & Monitoring</h3>
            <span className="px-2 py-1 bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 text-xs rounded font-mono">
              {watchlist.length} wallets
            </span>
          </div>
          <Button
            onClick={handleBatchAnalyze}
            disabled={batchLoading || watchlist.length === 0}
            className="h-9 px-4 bg-gradient-to-r from-emerald-600 to-cyan-600 border border-emerald-500/60 text-white font-mono text-xs disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {batchLoading ? "Analyzing All..." : "Batch Analyze All"}
          </Button>
        </div>

        <form onSubmit={handleAdd} className="flex flex-wrap gap-3 items-center mt-4">
          <Input
            placeholder="Wallet address to watch..."
            value={walletAddress}
            onChange={(e) => setWalletAddress(e.target.value)}
            className="flex-1 min-w-[220px] bg-black/60 border-emerald-500/40 text-gray-100 placeholder:text-gray-600 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 font-mono text-sm"
          />
          <Input
            placeholder="Label (optional)"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="w-40 bg-black/60 border-emerald-500/40 text-gray-100 placeholder:text-gray-600 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 font-mono text-sm"
          />
          <Button
            type="submit"
            disabled={!walletAddress.trim()}
            className="h-9 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Add to Watchlist
          </Button>
        </form>
      </div>

      {/* Watchlist Table */}
      <div className="bg-gradient-to-br from-gray-900/80 to-black/80 backdrop-blur-xl border border-emerald-500/30 rounded-lg p-6">
        {loading ? (
          <div className="py-12 flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin" />
            <p className="text-gray-500 font-mono text-sm">Loading watchlist...</p>
          </div>
        ) : watchlist.length === 0 ? (
          <div className="py-12 flex flex-col items-center gap-3">
            <div className="p-4 bg-gradient-to-br from-emerald-500/10 to-cyan-500/10 rounded-lg border border-emerald-500/30">
              <Shield className="w-10 h-10 text-gray-600" />
            </div>
            <p className="text-gray-500 font-mono text-sm">No wallets in watchlist yet.</p>
            <p className="text-gray-600 text-xs font-mono">Add a wallet above to start monitoring.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm font-mono">
              <thead>
                <tr className="border-b border-emerald-500/30">
                  <th className="text-left py-3 px-4 text-emerald-400 text-xs">Wallet</th>
                  <th className="text-left py-3 px-4 text-emerald-400 text-xs">Label</th>
                  <th className="text-left py-3 px-4 text-emerald-400 text-xs">Last Risk</th>
                  <th className="text-left py-3 px-4 text-emerald-400 text-xs">Last Checked</th>
                  <th className="text-left py-3 px-4 text-emerald-400 text-xs">Actions</th>
                </tr>
              </thead>
              <tbody>
                {watchlist.map((item) => (
                  <tr
                    key={item.id}
                    className="border-b border-emerald-500/10 hover:bg-emerald-950/10 transition-colors"
                  >
                    <td className="py-3 px-4 text-gray-200 break-all max-w-xs">
                      {item.wallet_address}
                    </td>
                    <td className="py-3 px-4 text-gray-400">
                      {item.label || <span className="text-gray-600 text-xs">—</span>}
                    </td>
                    <td className="py-3 px-4">
                      {item.last_risk_score != null ? (
                        <span className="px-2 py-1 bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 text-xs rounded">
                          {(item.last_risk_score * 100).toFixed(0)}%{" "}
                          <span className="text-gray-500">
                            ({item.last_risk_level || "N/A"})
                          </span>
                        </span>
                      ) : (
                        <span className="text-gray-600 text-xs">Not analyzed</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-gray-400 text-xs">
                      {formatDateTime(item.last_checked_at)}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <Button
                          onClick={() => handleAnalyzeOne(item.id)}
                          disabled={analyzingId === item.id}
                          className="h-8 px-3 bg-gradient-to-r from-emerald-600 to-cyan-600 border border-emerald-500/40 text-white text-xs"
                        >
                          {analyzingId === item.id ? "Analyzing..." : "Analyze"}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => handleRemove(item.id)}
                          className="h-8 px-3 border-red-500/40 text-red-400 text-xs hover:bg-red-950/40"
                        >
                          Remove
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}


function AIAnalysisSection() {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [filters, setFilters] = useState({
    wallet_address: "",
    risk_level: "all",
    status: "all",
  });

  // Fetch reports from SQL database (filtered by investigator role)
  const fetchReports = async () => {
    setLoading(true);
    try {
      // Get authentication token
      const token = localStorage.getItem("investigator_token") || localStorage.getItem("access_token");
      
      const params = new URLSearchParams();
      if (filters.wallet_address) params.append("wallet_address", filters.wallet_address);
      if (filters.risk_level && filters.risk_level !== "all") params.append("risk_level", filters.risk_level);
      if (filters.status && filters.status !== "all") params.append("status", filters.status);

      const headers: HeadersInit = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await fetch(apiUrl(`incidents/reports?${params.toString()}`), {
        headers: headers,
      });
      
      if (response.ok) {
        const data = await response.json();
        setReports(data);
      } else if (response.status === 401 || response.status === 403) {
        console.error("Authentication error or insufficient permissions");
        setReports([]);
      }
    } catch (error) {
      console.error("Error fetching reports:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [filters]);

  const handleRefresh = () => {
    fetchReports();
  };

  const handleViewReport = async (reportId: string) => {
    try {
      // Get authentication token
      const token = localStorage.getItem("investigator_token") || localStorage.getItem("access_token");
      
      const headers: HeadersInit = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await fetch(apiUrl(`incidents/reports/${reportId}`), {
        headers: headers,
      });
      
      if (response.ok) {
        const data = await response.json();
        // Convert stored format to display format
        const displayData = {
          wallet: data.wallet_address,
          risk_score: data.risk_score,
          risk_level: data.risk_level,
          detected_patterns: data.detected_patterns,
          summary: data.summary,
          graph_data: data.graph_data,
          timeline: data.timeline,
          // Prefer top-level transactions, fall back to summary.transactions if present
          transactions: data.transactions || data.summary?.transactions || [],
          report_id: reportId,
          notes: data.notes || [],
          system_conclusion: data.system_conclusion,
        };
        setSelectedReport(displayData);
      } else if (response.status === 403) {
        alert("You do not have permission to view this report. You can only view your own reports.");
      } else if (response.status === 401) {
        alert("Authentication required. Please log in again.");
      }
    } catch (error) {
      console.error("Error fetching report:", error);
    }
  };

  const handleStatusUpdate = async (reportId: string, newStatus: string) => {
    try {
      const response = await fetch(
        apiUrl(`incidents/reports/${reportId}/status?status=${newStatus}`),
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          }
        }
      );
      if (response.ok) {
        fetchReports(); // Refresh list
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error("Error updating status:", errorData);
      }
    } catch (error) {
      console.error("Error updating status:", error);
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "investigating":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/40";
      case "resolved":
        return "bg-green-500/20 text-green-400 border-green-500/40";
      case "closed":
        return "bg-gray-500/20 text-gray-400 border-gray-500/40";
      case "escalated":
        return "bg-red-500/20 text-red-400 border-red-500/40";
      default:
        return "bg-gray-500/20 text-gray-400 border-gray-500/40";
    }
  };

  const getRiskBadgeColor = (risk: number | string | undefined) => {
    // Handle string risk levels
    if (typeof risk === "string") {
      const upper = risk.toUpperCase();
      if (upper.includes("CRITICAL") || upper.includes("HIGH")) return "bg-red-950/40 border-red-500/30 text-red-400";
      if (upper.includes("MEDIUM") || upper.includes("MODERATE")) return "bg-orange-950/40 border-orange-500/30 text-orange-400";
      if (upper.includes("LOW")) return "bg-green-950/40 border-green-500/30 text-green-400";
      return "bg-yellow-950/40 border-yellow-500/30 text-yellow-400";
    }
    // Handle numeric risk scores
    if (typeof risk === "number") {
      if (risk >= 0.8) return "bg-red-950/40 border-red-500/30 text-red-400";
      if (risk >= 0.6) return "bg-orange-950/40 border-orange-500/30 text-orange-400";
      if (risk >= 0.4) return "bg-yellow-950/40 border-yellow-500/30 text-yellow-400";
      return "bg-green-950/40 border-green-500/30 text-green-400";
    }
    // Default
    return "bg-gray-950/40 border-gray-500/30 text-gray-400";
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
    } catch {
      return dateString;
    }
  };

  const formatTime = (dateString: string) => {
    if (!dateString) return "N/A";
    try {
      const date = new Date(dateString);
      return date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
    } catch {
      return "";
    }
  };

  // If a report is selected, show the full report
  if (selectedReport) {
    return (
      <div className="max-w-6xl space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl text-cyan-400 font-mono">Incident Report Details</h2>
          <Button
            onClick={() => setSelectedReport(null)}
            className="bg-gray-800 border border-gray-600 text-gray-300 hover:text-white font-mono text-sm"
          >
            Back to List
          </Button>
        </div>
        <IncidentReportDisplay reportData={selectedReport} />
      </div>
    );
  }

  return (
    <div className="max-w-6xl space-y-6">
      {/* Header Info */}
      <div className="bg-gradient-to-br from-gray-900/80 to-black/80 backdrop-blur-xl border border-cyan-500/30 rounded-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-gradient-to-br from-cyan-500/20 to-emerald-500/20 rounded-lg border border-cyan-500/30">
            <Brain className="w-5 h-5 text-cyan-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg text-cyan-400 font-mono">AI Analysis History</h3>
            <p className="text-xs text-gray-500 font-mono">View and manage all incident reports and analysis</p>
          </div>
          <TextToSpeechIconButton
            text="AI Analysis History. View and manage all incident reports and analysis. View Reports. Browse all incident reports and analysis history. Track Status. Monitor risk scores, patterns, and case status. Manage Reports. Update report status and add investigator notes. Filter and Search. Search and filter through investigation reports."
            className="ml-2"
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="flex items-start gap-3 p-4 bg-gradient-to-r from-cyan-950/20 to-emerald-950/20 border border-cyan-500/20 rounded-lg">
            <div className="p-2 bg-cyan-500/10 rounded-lg border border-cyan-500/30">
              <BarChart3 className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-cyan-400 font-mono mb-1">View Reports</p>
              <p className="text-xs text-gray-400 font-mono">Browse all incident reports and analysis history</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-4 bg-gradient-to-r from-cyan-950/20 to-emerald-950/20 border border-cyan-500/20 rounded-lg">
            <div className="p-2 bg-emerald-500/10 rounded-lg border border-emerald-500/30">
              <Activity className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <p className="text-sm text-emerald-400 font-mono mb-1">Track Status</p>
              <p className="text-xs text-gray-400 font-mono">Monitor risk scores, patterns, and case status</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-4 bg-gradient-to-r from-cyan-950/20 to-emerald-950/20 border border-cyan-500/20 rounded-lg">
            <div className="p-2 bg-yellow-500/10 rounded-lg border border-yellow-500/30">
              <FileText className="w-4 h-4 text-yellow-400" />
            </div>
            <div>
              <p className="text-sm text-yellow-400 font-mono mb-1">Manage Reports</p>
              <p className="text-xs text-gray-400 font-mono">Update report status and add investigator notes</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-4 bg-gradient-to-r from-cyan-950/20 to-emerald-950/20 border border-cyan-500/20 rounded-lg">
            <div className="p-2 bg-purple-500/10 rounded-lg border border-purple-500/30">
              <Search className="w-4 h-4 text-purple-400" />
            </div>
            <div>
              <p className="text-sm text-purple-400 font-mono mb-1">Filter & Search</p>
              <p className="text-xs text-gray-400 font-mono">Search and filter through investigation reports</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-gradient-to-br from-gray-900/80 to-black/80 backdrop-blur-xl border border-cyan-500/30 rounded-lg p-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-cyan-400" />
            <span className="text-sm text-cyan-400 font-mono">Filters</span>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <Input
              placeholder="Search wallet address..."
              value={filters.wallet_address}
              onChange={(e) => setFilters({ ...filters, wallet_address: e.target.value })}
              className="w-48 bg-black/60 border-cyan-500/40 text-gray-100 placeholder:text-gray-600 focus:border-cyan-400 font-mono text-sm"
            />

            <Select value={filters.risk_level} onValueChange={(value) => setFilters({ ...filters, risk_level: value })}>
              <SelectTrigger className="w-40 bg-black/60 border-cyan-500/40 text-gray-100 font-mono text-sm">
                <SelectValue placeholder="Risk Level" />
              </SelectTrigger>
              <SelectContent className="bg-gray-900 border-cyan-500/40">
                <SelectItem value="all" className="font-mono">All Levels</SelectItem>
                <SelectItem value="VERY HIGH" className="font-mono text-red-400">Very High</SelectItem>
                <SelectItem value="HIGH" className="font-mono text-orange-400">High</SelectItem>
                <SelectItem value="MEDIUM" className="font-mono text-yellow-400">Medium</SelectItem>
                <SelectItem value="LOW" className="font-mono text-green-400">Low</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filters.status} onValueChange={(value) => setFilters({ ...filters, status: value })}>
              <SelectTrigger className="w-40 bg-black/60 border-cyan-500/40 text-gray-100 font-mono text-sm">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="bg-gray-900 border-cyan-500/40">
                <SelectItem value="all" className="font-mono">All Status</SelectItem>
                <SelectItem value="investigating" className="font-mono text-yellow-400">Investigating</SelectItem>
                <SelectItem value="resolved" className="font-mono text-green-400">Resolved</SelectItem>
                <SelectItem value="closed" className="font-mono text-gray-400">Closed</SelectItem>
                <SelectItem value="escalated" className="font-mono text-red-400">Escalated</SelectItem>
              </SelectContent>
            </Select>

            <Button
              onClick={handleRefresh}
              className="flex items-center gap-2 bg-gradient-to-r from-cyan-950/40 to-emerald-950/40 border border-cyan-500/30 hover:border-cyan-500/60 text-cyan-400 hover:text-cyan-300 font-mono text-sm"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* Reports Table */}
      <div className="bg-gradient-to-br from-gray-900/80 to-black/80 backdrop-blur-xl border border-cyan-500/30 rounded-lg p-6">
        <div className="flex items-center gap-2 mb-6">
          <Brain className="w-5 h-5 text-cyan-400" />
          <h3 className="text-lg text-cyan-400 font-mono">Incident Reports</h3>
          <span className="px-2 py-1 bg-cyan-950/40 border border-cyan-500/30 text-cyan-400 text-xs rounded font-mono">
            {reports.length} {reports.length === 1 ? "report" : "reports"}
          </span>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-cyan-500/30">
                <th className="text-left py-3 px-4 text-sm text-cyan-400 font-mono">Wallet Address</th>
                <th className="text-left py-3 px-4 text-sm text-cyan-400 font-mono">Risk Assessment</th>
                <th className="text-left py-3 px-4 text-sm text-cyan-400 font-mono">Detected Patterns</th>
                <th className="text-left py-3 px-4 text-sm text-cyan-400 font-mono">Status</th>
                <th className="text-left py-3 px-4 text-sm text-cyan-400 font-mono">Notes</th>
                <th className="text-left py-3 px-4 text-sm text-cyan-400 font-mono">Created</th>
                <th className="text-left py-3 px-4 text-sm text-cyan-400 font-mono">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="w-8 h-8 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin"></div>
                      <p className="text-gray-500 font-mono text-sm">Loading reports...</p>
                    </div>
                  </td>
                </tr>
              ) : reports.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="p-4 bg-gradient-to-br from-cyan-500/10 to-emerald-500/10 rounded-lg border border-cyan-500/20">
                        <BarChart3 className="w-12 h-12 text-gray-600" />
                      </div>
                      <p className="text-gray-500 font-mono text-sm">No reports found</p>
                      <p className="text-gray-600 text-xs font-mono">Generate a report to see it here</p>
                    </div>
                  </td>
                </tr>
              ) : (
                reports.map((report) => (
                  <tr
                    key={report._id}
                    className="border-b border-cyan-500/10 hover:bg-cyan-950/10 transition-colors"
                  >
                    <td className="py-4 px-4">
                      <div className="font-mono text-sm text-gray-300 break-all max-w-xs">
                        {report.wallet_address}
                      </div>
                      {report.summary?.pattern_type && (
                        <div className="font-mono text-xs text-cyan-400 mt-1">
                          {report.summary.pattern_type}
                        </div>
                      )}
                    </td>
                    {/* Risk Assessment Column */}
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2 flex-wrap">
                        {report.risk_score != null ? (
                          <div className={`px-2 py-1 rounded font-mono text-xs border ${getRiskBadgeColor(report.risk_score)}`}>
                            {(report.risk_score * 100).toFixed(0)}%
                          </div>
                        ) : null}
                        {report.risk_level ? (
                          <span className={`px-2 py-1 rounded font-mono text-xs border ${getRiskBadgeColor(report.risk_level)}`}>
                            {report.risk_level.toUpperCase()}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-600 font-mono">N/A</span>
                        )}
                      </div>
                    </td>
                    {/* Detected Patterns Column */}
                    <td className="py-4 px-4">
                      <div className="flex flex-wrap gap-1">
                        {report.detected_patterns && report.detected_patterns.length > 0 ? (
                          <>
                            {report.detected_patterns.slice(0, 2).map((pattern: string, index: number) => (
                              <span
                                key={index}
                                className="px-2 py-1 bg-cyan-950/40 border border-cyan-500/30 text-cyan-400 text-xs rounded font-mono"
                              >
                                {pattern.length > 20 ? pattern.substring(0, 20) + "..." : pattern}
                              </span>
                            ))}
                            {report.detected_patterns.length > 2 && (
                              <span className="px-2 py-1 bg-gray-950/40 border border-gray-500/30 text-gray-400 text-xs rounded font-mono">
                                +{report.detected_patterns.length - 2}
                              </span>
                            )}
                          </>
                        ) : (
                          <span className="text-xs text-gray-600 font-mono">No patterns</span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <Select
                        value={report.status || "investigating"}
                        onValueChange={(value) => handleStatusUpdate(report._id, value)}
                      >
                        <SelectTrigger className={`w-32 h-7 text-xs font-mono border ${getStatusBadgeColor(report.status || "investigating")}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-900 border-cyan-500/40">
                          <SelectItem value="investigating" className="font-mono text-yellow-400">Investigating</SelectItem>
                          <SelectItem value="resolved" className="font-mono text-green-400">Resolved</SelectItem>
                          <SelectItem value="closed" className="font-mono text-gray-400">Closed</SelectItem>
                          <SelectItem value="escalated" className="font-mono text-red-400">Escalated</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                    {/* Notes Column */}
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        {report.notes && Array.isArray(report.notes) ? (
                          <span className="px-2 py-1 bg-cyan-950/40 border border-cyan-500/30 text-cyan-400 text-xs rounded font-mono">
                            {report.notes.length} {report.notes.length === 1 ? "note" : "notes"}
                          </span>
                        ) : report.notes ? (
                          <span className="px-2 py-1 bg-cyan-950/40 border border-cyan-500/30 text-cyan-400 text-xs rounded font-mono">
                            1 note
                          </span>
                        ) : (
                          <span className="text-xs text-gray-600 font-mono">0 notes</span>
                        )}
                      </div>
                    </td>
                    {/* Created Column */}
                    <td className="py-4 px-4">
                      <div className="text-sm text-gray-400 font-mono">{formatDate(report.created_at)}</div>
                      <div className="text-xs text-gray-600 font-mono">{formatTime(report.created_at)}</div>
                    </td>
                    {/* Actions Column */}
                    <td className="py-4 px-4">
                      <Button
                        onClick={() => handleViewReport(report._id)}
                        className="px-3 py-1.5 bg-gradient-to-r from-cyan-950/40 to-emerald-950/40 border border-cyan-500/30 hover:border-cyan-500/60 text-cyan-400 hover:text-cyan-300 rounded transition-all font-mono text-xs"
                      >
                        View Report
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function ContactPoliceSection({
  investigatorId,
  onUseWalletForEvidence,
}: {
  investigatorId: number | null;
  onUseWalletForEvidence?: (walletId: string) => void;
}) {
  const [step, setStep] = useState(1);
  const [walletId, setWalletId] = useState("");
  const [selectedStation, setSelectedStation] = useState<any>(null);
  const [incidentDescription, setIncidentDescription] = useState("");
  const [internalNotes, setInternalNotes] = useState("");
  const [walletEvidence, setWalletEvidence] = useState<any[]>([]);
  const [evidenceLoading, setEvidenceLoading] = useState(false);
  const [policeContacts, setPoliceContacts] = useState<any[]>([]);
  const [contactsLoading, setContactsLoading] = useState(true);
  const [selectedOfficerDesignation, setSelectedOfficerDesignation] = useState<string>("");

  // Mock case data based on wallet ID - includes existing evidence files
  const caseData = {
    caseId: "CASE-980",
    riskScore: 28,
    investigator: "Current Investigator",
    evidenceFiles: [
      {
        id: 1,
        filename: "transaction_log_analysis.pdf",
        fileSize: "2.3 MB",
        uploadedBy: "Current Investigator",
        uploadDate: "2025-12-03",
        uploadTime: "14:32:18",
        evidenceType: "Transaction Analysis",
      },
      {
        id: 2,
        filename: "wallet_activity_export.csv",
        fileSize: "1.8 MB",
        uploadedBy: "Current Investigator",
        uploadDate: "2025-12-02",
        uploadTime: "09:15:42",
        evidenceType: "Activity Export",
      },
      {
        id: 3,
        filename: "blockchain_trace_report.pdf",
        fileSize: "3.7 MB",
        uploadedBy: "System Analyst",
        uploadDate: "2025-12-01",
        uploadTime: "16:45:30",
        evidenceType: "Blockchain Trace",
      },
      {
        id: 4,
        filename: "suspicious_pattern_screenshot.png",
        fileSize: "845 KB",
        uploadedBy: "Current Investigator",
        uploadDate: "2025-12-03",
        uploadTime: "10:20:15",
        evidenceType: "Visual Evidence",
      },
    ],
  };

  // Load cybercrime contacts JSON
  useEffect(() => {
    const loadContacts = async () => {
      try {
        const res = await fetch("/cybercrime_contacts.json");
        if (res.ok) {
          const data = await res.json();
          setPoliceContacts(data);
        }
      } catch (e) {
        console.error("Error loading police contacts", e);
      } finally {
        setContactsLoading(false);
      }
    };
    loadContacts();
  }, []);

  const fetchWalletEvidence = async (walletAddress: string) => {
    setEvidenceLoading(true);
    try {
      const token = localStorage.getItem("investigator_token") || localStorage.getItem("access_token");
      const headers: HeadersInit = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      const res = await fetch(apiUrl("evidence/"), { headers });
      if (res.ok) {
        const data = await res.json();
        const filtered = (data as any[]).filter((item) => {
          const desc = (item.description || "") as string;
          // Look for line starting with "Wallet:" that matches this wallet
          const lines = desc.split("\n");
          for (const line of lines) {
            if (line.startsWith("Wallet:")) {
              const value = line.replace("Wallet:", "").trim();
              if (value.toLowerCase() === walletAddress.toLowerCase()) {
                return true;
              }
            }
          }
          return false;
        });
        setWalletEvidence(filtered);
      } else {
        setWalletEvidence([]);
      }
    } catch (e) {
      console.error("Error fetching wallet evidence", e);
      setWalletEvidence([]);
    } finally {
      setEvidenceLoading(false);
    }
  };

  const handleSubmitWallet = () => {
    const trimmed = walletId.trim();
    if (trimmed) {
      setStep(2);
      fetchWalletEvidence(trimmed);
      onUseWalletForEvidence?.(trimmed);
    }
  };

  const handleSelectOfficer = (designation: string) => {
    setSelectedOfficerDesignation(designation);
    const officer = policeContacts.find(
      (contact) => contact["Officer/Designation"] === designation
    );
    if (officer) {
      setSelectedStation(officer);
    }
  };

  const handleContinueToReport = () => {
    if (selectedStation) {
      setStep(4);
    }
  };

  return (
    <div className="max-w-5xl space-y-6">
      {/* Step Progress Indicator */}
      <div className="bg-gradient-to-br from-gray-900/80 to-black/80 backdrop-blur-xl border border-emerald-500/30 rounded-lg p-6">
        <div className="flex items-center justify-between">
          {[
            { num: 1, label: "Enter Wallet ID" },
            { num: 2, label: "Evidence Auto-Attach" },
            { num: 3, label: "Police Station" },
          ].map((item, index) => (
            <div key={item.num} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-1">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-mono border-2 transition-all ${step >= item.num
                      ? "bg-emerald-500/20 border-emerald-500 text-emerald-400"
                      : "bg-gray-800/60 border-gray-600 text-gray-500"
                    }`}
                >
                  {item.num}
                </div>
                <span
                  className={`mt-2 text-xs font-mono ${step >= item.num ? "text-emerald-400" : "text-gray-500"
                    }`}
                >
                  {item.label}
                </span>
              </div>
              {index < 2 && (
                <div
                  className={`h-0.5 flex-1 -mt-6 transition-all ${step > item.num ? "bg-emerald-500" : "bg-gray-700"
                    }`}
                ></div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Step 1: Enter Wallet ID */}
      {step === 1 && (
        <div className="bg-gradient-to-br from-gray-900/80 to-black/80 backdrop-blur-xl border border-emerald-500/30 rounded-lg p-6">
          <h3 className="text-lg text-emerald-400 font-mono mb-4">Step 1: Enter Wallet ID</h3>
          <div className="space-y-4">
            <div>
              <Label htmlFor="walletId" className="text-gray-300 font-mono mb-2 block">
                Wallet ID *
              </Label>
              <Input
                id="walletId"
                type="text"
                placeholder="Enter wallet address..."
                value={walletId}
                onChange={(e) => setWalletId(e.target.value)}
                className="bg-black/60 border-emerald-500/40 text-gray-100 placeholder:text-gray-600 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 transition-all font-mono"
              />
            </div>
            <Button
              onClick={handleSubmitWallet}
              disabled={!walletId.trim()}
              className="w-full relative overflow-hidden bg-gradient-to-r from-emerald-600 via-cyan-600 to-emerald-600 hover:from-emerald-500 hover:via-cyan-500 hover:to-emerald-500 text-white shadow-lg shadow-emerald-500/30 transition-all duration-300 h-12 group/btn border border-emerald-400/30 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="flex items-center justify-center gap-2 font-mono">
                Submit
              </span>
            </Button>
          </div>
        </div>
      )}

      {/* Step 2: Evidence Files from Wallet Address */}
      {step === 2 && (
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-gray-900/80 to-black/80 backdrop-blur-xl border border-emerald-500/30 rounded-lg p-6">
            <h3 className="text-lg text-emerald-400 font-mono mb-4">Step 2: Evidence Files from Wallet Address</h3>

            {/* Wallet Info */}
            <div className="mb-6 p-4 bg-gradient-to-r from-emerald-950/40 to-cyan-950/40 border border-emerald-500/30 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-5 h-5 text-emerald-400" />
                <span className="text-emerald-400 font-mono">Wallet Address:</span>
              </div>
              <p className="text-gray-100 font-mono text-sm break-all">{walletId}</p>
            </div>

            {/* Case Details */}
            <div className="mb-6">
              <h4 className="text-md text-cyan-400 font-mono mb-3">Case Details</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-gray-400 font-mono text-sm">Case ID:</span>
                  <span className="text-emerald-400 font-mono text-sm">{caseData.caseId}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-400 font-mono text-sm">Risk Score:</span>
                  <span className="px-2 py-1 bg-green-950/40 border border-green-500/30 text-green-400 text-xs rounded font-mono">
                    {caseData.riskScore}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-400 font-mono text-sm">Investigator:</span>
                  <span className="text-gray-100 font-mono text-sm">{caseData.investigator}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-400 font-mono text-sm">Evidence Count:</span>
                  <span className="text-gray-100 font-mono text-sm">{caseData.evidenceFiles.length} files</span>
                </div>
              </div>
            </div>

            {/* Evidence Files Present in Wallet Address */}
            <div>
              <h4 className="text-md text-cyan-400 font-mono mb-3 flex items-center gap-2">
                <FolderOpen className="w-5 h-5" />
                Evidence Files Present in Wallet Address
                <span className="px-2 py-1 bg-cyan-950/40 border border-cyan-500/30 text-cyan-400 text-xs rounded font-mono">
                  {walletEvidence.length} files
                </span>
              </h4>

              {evidenceLoading ? (
                <div className="py-8 flex flex-col items-center gap-3">
                  <div className="w-6 h-6 border-2 border-emerald-400/40 border-t-emerald-400 rounded-full animate-spin" />
                  <p className="text-gray-500 text-xs font-mono">
                    Loading evidence files for this wallet...
                  </p>
                </div>
              ) : walletEvidence.length === 0 ? (
                <div className="py-8 flex flex-col items-center gap-3">
                  <div className="p-3 bg-gradient-to-br from-emerald-500/10 to-cyan-500/10 rounded-lg border border-emerald-500/30">
                    <FolderOpen className="w-6 h-6 text-gray-600" />
                  </div>
                  <p className="text-gray-500 text-xs font-mono">
                    No evidence files found for this wallet ID.
                  </p>
                  <p className="text-gray-600 text-[11px] font-mono">
                    Upload evidence in the Evidence Upload section using the same wallet ID to see it here.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {walletEvidence.map((item) => {
                    const createdAt = item.created_at ? new Date(item.created_at) : null;
                    const uploadDate = createdAt
                      ? createdAt.toLocaleDateString("en-GB")
                      : "—";
                    const uploadTime = createdAt
                      ? createdAt.toLocaleTimeString("en-GB", {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })
                      : "—";
                    return (
                      <div
                        key={item.id}
                        className="p-4 bg-gradient-to-r from-emerald-950/20 to-cyan-950/20 border border-emerald-500/30 rounded-lg hover:border-emerald-500/50 transition-all"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-3 flex-1">
                            <FileText className="w-5 h-5 text-emerald-400 mt-1" />
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <p className="text-gray-100 font-mono text-sm">
                                  📄 {item.title || item.evidence_id || "Evidence file"}
                                </p>
                              </div>
                              <p className="text-gray-500 text-xs font-mono mb-2 line-clamp-2">
                                {item.description || "No description provided."}
                              </p>
                              <div className="flex items-center gap-3 text-xs text-gray-600 font-mono">
                                <div className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {uploadDate}
                                </div>
                                <div className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {uploadTime}
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button className="p-2 bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 rounded transition-all text-[11px] font-mono">
                              View
                            </button>
                          </div>
                        </div>
                        <div className="mt-2 pt-2 border-t border-emerald-500/20 text-[11px] text-gray-500 font-mono">
                          Hash: {item.hash || "N/A"}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <Button
            onClick={() => setStep(3)}
            className="w-full relative overflow-hidden bg-gradient-to-r from-emerald-600 via-cyan-600 to-emerald-600 hover:from-emerald-500 hover:via-cyan-500 hover:to-emerald-500 text-white shadow-lg shadow-emerald-500/30 transition-all duration-300 h-12 group/btn border border-emerald-400/30"
          >
            <span className="flex items-center justify-center gap-2 font-mono">
              Continue to Police Station Selection
            </span>
          </Button>
        </div>
      )}

      {/* Step 3: Police Station Selection */}
      {step === 3 && (
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-gray-900/80 to-black/80 backdrop-blur-xl border border-emerald-500/30 rounded-lg p-6">
            <h3 className="text-lg text-emerald-400 font-mono mb-4">Step 3: Police Station Selection</h3>
            <div className="space-y-4">
              <Label className="text-gray-300 font-mono mb-3 block">Select Officer/Designation</Label>

              {contactsLoading ? (
                <div className="py-8 flex flex-col items-center gap-3">
                  <div className="w-6 h-6 border-2 border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin" />
                  <p className="text-gray-500 font-mono text-sm">Loading police contacts...</p>
                </div>
              ) : (
                <>
                  <Select
                    value={selectedOfficerDesignation}
                    onValueChange={handleSelectOfficer}
                  >
                    <SelectTrigger className="w-full bg-black/60 border-emerald-500/40 text-gray-100 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 transition-all font-mono">
                      <SelectValue placeholder="Select an Officer/Designation..." />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-900 border-emerald-500/40 max-h-[300px]">
                      {policeContacts.map((contact, index) => (
                        <SelectItem
                          key={index}
                          value={contact["Officer/Designation"]}
                          className="font-mono text-gray-300 focus:bg-emerald-950/40 cursor-pointer"
                        >
                          {contact["Officer/Designation"]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Display selected officer details */}
                  {selectedStation && (
                    <div className="mt-6 p-5 bg-gradient-to-r from-emerald-950/20 to-cyan-950/20 border border-emerald-500/50 rounded-lg">
                      <div className="flex items-start justify-between mb-4">
                        <h4 className="text-gray-100 font-mono text-lg">
                          {selectedStation["Officer/Designation"]}
                        </h4>
                        <span className="px-3 py-1 bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 text-xs rounded font-mono flex items-center gap-1">
                          <Check className="w-3 h-3" />
                          Selected
                        </span>
                      </div>

                      <div className="space-y-3">
                        {selectedStation["Address"] && (
                          <div>
                            <p className="text-gray-500 font-mono text-xs mb-1">Address:</p>
                            <p className="text-gray-300 font-mono text-sm">{selectedStation["Address"]}</p>
                          </div>
                        )}

                        {selectedStation["Email"] && selectedStation["Email"].length > 0 && (
                          <div>
                            <p className="text-gray-500 font-mono text-xs mb-1">Email:</p>
                            <div className="flex flex-wrap gap-2">
                              {selectedStation["Email"].map((email: string, idx: number) => (
                                <a
                                  key={idx}
                                  href={`mailto:${email}`}
                                  className="text-cyan-400 hover:text-cyan-300 font-mono text-sm underline"
                                >
                                  {email}
                                </a>
                              ))}
                            </div>
                          </div>
                        )}

                        {selectedStation["Mobile"] && selectedStation["Mobile"].length > 0 && (
                          <div>
                            <p className="text-gray-500 font-mono text-xs mb-1">Mobile:</p>
                            <div className="flex flex-wrap gap-2">
                              {selectedStation["Mobile"].map((mobile: string, idx: number) => (
                                <a
                                  key={idx}
                                  href={`tel:${mobile}`}
                                  className="text-emerald-400 hover:text-emerald-300 font-mono text-sm"
                                >
                                  {mobile}
                                </a>
                              ))}
                            </div>
                          </div>
                        )}

                        {selectedStation["Telephone"] && selectedStation["Telephone"].length > 0 && (
                          <div>
                            <p className="text-gray-500 font-mono text-xs mb-1">Telephone:</p>
                            <div className="flex flex-wrap gap-2">
                              {selectedStation["Telephone"].map((tel: string, idx: number) => (
                                <span key={idx} className="text-gray-300 font-mono text-sm">
                                  {tel}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {selectedStation["Regional Office"] && (
                          <div>
                            <p className="text-gray-500 font-mono text-xs mb-1">Regional Office:</p>
                            <p className="text-gray-300 font-mono text-sm">{selectedStation["Regional Office"]}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          <Button
            onClick={handleContinueToReport}
            disabled={!selectedStation}
            className="w-full relative overflow-hidden bg-gradient-to-r from-emerald-600 via-cyan-600 to-emerald-600 hover:from-emerald-500 hover:via-cyan-500 hover:to-emerald-500 text-white shadow-lg shadow-emerald-500/30 transition-all duration-300 h-12 group/btn border border-emerald-400/30 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="flex items-center justify-center gap-2 font-mono">
              Continue to Incident Report
            </span>
          </Button>
        </div>
      )}

      {/* Step 4: Description of Incident */}
      {step === 4 && selectedStation && (
        <div className="bg-gradient-to-br from-gray-900/80 to-black/80 backdrop-blur-xl border border-emerald-500/30 rounded-lg p-6">
          <h3 className="text-lg text-emerald-400 font-mono mb-4">Step 4: Description of Incident</h3>

          {/* Selected Station Info */}
          <div className="mb-6 p-4 bg-gradient-to-r from-emerald-950/40 to-cyan-950/40 border border-emerald-500/30 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Phone className="w-4 h-4 text-emerald-400" />
              <span className="text-emerald-400 font-mono text-sm">Reporting to:</span>
            </div>
            <p className="text-gray-100 font-mono">{selectedStation["Officer/Designation"]}</p>
            {selectedStation["Address"] && (
              <p className="text-gray-500 font-mono text-xs mt-1">{selectedStation["Address"]}</p>
            )}
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="p-3 bg-gradient-to-r from-emerald-950/40 to-cyan-950/40 border border-emerald-500/30 rounded-lg">
              <p className="text-gray-500 text-xs font-mono mb-1">Wallet ID</p>
              <p className="text-gray-100 font-mono text-sm truncate" title={walletId}>{walletId}</p>
            </div>
            <div className="p-3 bg-gradient-to-r from-emerald-950/40 to-cyan-950/40 border border-emerald-500/30 rounded-lg">
              <p className="text-gray-500 text-xs font-mono mb-1">Case ID</p>
              <p className="text-emerald-400 font-mono text-sm">{caseData.caseId}</p>
            </div>
            <div className="p-3 bg-gradient-to-r from-emerald-950/40 to-cyan-950/40 border border-emerald-500/30 rounded-lg">
              <p className="text-gray-500 text-xs font-mono mb-1">Risk Score</p>
              <p className="text-green-400 font-mono text-sm">{caseData.riskScore}</p>
            </div>
            <div className="p-3 bg-gradient-to-r from-emerald-950/40 to-cyan-950/40 border border-emerald-500/30 rounded-lg">
              <p className="text-gray-500 text-xs font-mono mb-1">Evidence Count</p>
              <p className="text-gray-100 font-mono text-sm">{caseData.evidenceFiles.length} files</p>
            </div>
          </div>

          {/* Form */}
          <form className="space-y-4">
            <div>
              <Label htmlFor="incident" className="text-gray-300 font-mono mb-2 block">
                Description of Incident *
              </Label>
              <Textarea
                id="incident"
                placeholder="Provide a detailed summary of the incident, suspicious activities, and any relevant information for law enforcement..."
                value={incidentDescription}
                onChange={(e) => setIncidentDescription(e.target.value)}
                rows={6}
                className="bg-black/60 border-emerald-500/40 text-gray-100 placeholder:text-gray-600 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 transition-all font-mono resize-none"
              />
            </div>

            <div>
              <Label htmlFor="notes" className="text-gray-300 font-mono mb-2 block">
                Internal Notes (Optional)
              </Label>
              <Textarea
                id="notes"
                placeholder="Add any internal notes or additional context..."
                value={internalNotes}
                onChange={(e) => setInternalNotes(e.target.value)}
                rows={3}
                className="bg-black/60 border-emerald-500/40 text-gray-100 placeholder:text-gray-600 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 transition-all font-mono resize-none"
              />
            </div>

            <Button
              type="button"
              disabled={!incidentDescription.trim() || !selectedStation}
              onClick={async () => {
                if (!selectedStation || !incidentDescription.trim()) return;
                try {
                  // Auto-detect location
                  let locationData = {
                    city: null as string | null,
                    country: null as string | null,
                    lat: null as number | null,
                    lng: null as number | null,
                    ip: null as string | null,
                  };

                  try {
                    // Best-effort browser geolocation first (if user allows permission).
                    if (navigator.geolocation) {
                      await new Promise<void>((resolve) => {
                        navigator.geolocation.getCurrentPosition(
                          (position) => {
                            locationData.lat = position.coords.latitude;
                            locationData.lng = position.coords.longitude;
                            resolve();
                          },
                          () => resolve(),
                          { timeout: 5000, maximumAge: 60000 }
                        );
                      });
                    }

                    // Get IP address
                    const ipRes = await fetch("https://api.ipify.org?format=json");
                    if (ipRes.ok) {
                      const ipData = await ipRes.json();
                      locationData.ip = ipData.ip;

                      // Primary provider (HTTPS-safe): ipapi.co
                      let locationResolved = false;
                      const ipApiCoRes = await fetch(`https://ipapi.co/${locationData.ip}/json/`);
                      if (ipApiCoRes.ok) {
                        const ipApiCoData = await ipApiCoRes.json();
                        locationData.city = ipApiCoData.city || locationData.city;
                        locationData.country = ipApiCoData.country_name || locationData.country;
                        locationData.lat = locationData.lat ?? ipApiCoData.latitude ?? null;
                        locationData.lng = locationData.lng ?? ipApiCoData.longitude ?? null;
                        locationResolved = Boolean(
                          locationData.city ||
                          locationData.country ||
                          locationData.lat !== null ||
                          locationData.lng !== null
                        );
                      }

                      // Fallback provider: ipwho.is
                      if (!locationResolved) {
                        const ipWhoRes = await fetch(`https://ipwho.is/${locationData.ip}`);
                        if (ipWhoRes.ok) {
                          const ipWhoData = await ipWhoRes.json();
                          if (ipWhoData.success !== false) {
                            locationData.city = ipWhoData.city || locationData.city;
                            locationData.country = ipWhoData.country || locationData.country;
                            locationData.lat = locationData.lat ?? ipWhoData.latitude ?? null;
                            locationData.lng = locationData.lng ?? ipWhoData.longitude ?? null;
                          }
                        }
                      }
                    }
                  } catch (locError) {
                    console.error("Error detecting location:", locError);
                    // Continue without location data
                  }

                  const evidenceIds = walletEvidence.map((e) => e.id);
                  const complaintToken = localStorage.getItem("investigator_token") || localStorage.getItem("access_token");
                  const complaintHeaders: HeadersInit = {
                    "Content-Type": "application/json",
                  };
                  if (complaintToken) {
                    complaintHeaders["Authorization"] = `Bearer ${complaintToken}`;
                  }
                  const response = await fetch(apiUrl("complaints/"), {
                    method: "POST",
                    headers: complaintHeaders,
                    body: JSON.stringify({
                      wallet_address: walletId,
                      investigator_id: investigatorId,
                      officer_designation: selectedStation["Officer/Designation"],
                      officer_address: selectedStation["Address"] || null,
                      officer_email: selectedStation["Email"] || [],
                      officer_mobile: selectedStation["Mobile"] || [],
                      officer_telephone: selectedStation["Telephone"] || [],
                      incident_description: incidentDescription,
                      internal_notes: internalNotes || null,
                      evidence_ids: evidenceIds,
                      investigator_location_city: locationData.city,
                      investigator_location_country: locationData.country,
                      investigator_location_latitude: locationData.lat,
                      investigator_location_longitude: locationData.lng,
                      investigator_location_ip: locationData.ip,
                    }),
                  });
                  if (response.ok) {
                    // Reset form and go back to step 1
                    setStep(1);
                    setWalletId("");
                    setSelectedStation(null);
                    setSelectedOfficerDesignation("");
                    setIncidentDescription("");
                    setInternalNotes("");
                    setWalletEvidence([]);
                    alert("Complaint submitted successfully!");
                  } else {
                    const errorData = await response.json().catch(() => ({}));
                    alert(`Failed to submit complaint: ${errorData.detail || "Unknown error"}`);
                  }
                } catch (error) {
                  console.error("Error submitting complaint", error);
                  alert("Failed to submit complaint. Please try again.");
                }
              }}
              className="w-full relative overflow-hidden bg-gradient-to-r from-emerald-600 via-cyan-600 to-emerald-600 hover:from-emerald-500 hover:via-cyan-500 hover:to-emerald-500 text-white shadow-lg shadow-emerald-500/30 transition-all duration-300 h-12 group/btn border border-emerald-400/30 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="flex items-center justify-center gap-2 font-mono">
                <PhoneCall className="w-5 h-5" />
                Submit Wallet Complaint
              </span>
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}

function ComplaintHistorySection() {
  const [complaints, setComplaints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedComplaint, setSelectedComplaint] = useState<any>(null);
  const [filters, setFilters] = useState({
    wallet_address: "",
    status: "all",
  });

  const fetchComplaints = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("investigator_token") || localStorage.getItem("access_token");
      const headers: HeadersInit = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      const response = await fetch(apiUrl("complaints/"), { headers });
      if (response.ok) {
        const data = await response.json();
        setComplaints(data);
      }
    } catch (error) {
      console.error("Error fetching complaints:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComplaints();
  }, []);

  const handleViewComplaint = (complaint: any) => {
    setSelectedComplaint(complaint);
  };

  const handleStatusUpdate = async (complaintId: number, newStatus: string) => {
    try {
      const response = await fetch(
        apiUrl(`complaints/${complaintId}/status?status=${newStatus}`),
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
      if (response.ok) {
        fetchComplaints();
        if (selectedComplaint && selectedComplaint.id === complaintId) {
          setSelectedComplaint({ ...selectedComplaint, status: newStatus });
        }
      }
    } catch (error) {
      console.error("Error updating complaint status:", error);
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "submitted":
        return "bg-blue-500/20 text-blue-400 border-blue-500/40";
      case "under_review":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/40";
      case "resolved":
        return "bg-green-500/20 text-green-400 border-green-500/40";
      case "closed":
        return "bg-gray-500/20 text-gray-400 border-gray-500/40";
      default:
        return "bg-gray-500/20 text-gray-400 border-gray-500/40";
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
    } catch {
      return dateString;
    }
  };

  const formatTime = (dateString: string) => {
    if (!dateString) return "N/A";
    try {
      const date = new Date(dateString);
      return date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
    } catch {
      return "";
    }
  };

  const filteredComplaints = complaints.filter((complaint) => {
    const matchesWallet =
      !filters.wallet_address ||
      complaint.wallet_address.toLowerCase().includes(filters.wallet_address.toLowerCase());
    const matchesStatus = filters.status === "all" || complaint.status === filters.status;
    return matchesWallet && matchesStatus;
  });

  // If a complaint is selected, show the full details
  if (selectedComplaint) {
    return (
      <div className="max-w-6xl space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl text-cyan-400 font-mono">Complaint Details</h2>
          <Button
            onClick={() => setSelectedComplaint(null)}
            className="bg-gray-800 border border-gray-600 text-gray-300 hover:text-white font-mono text-sm"
          >
            Back to List
          </Button>
        </div>

        <div className="bg-gradient-to-br from-gray-900/80 to-black/80 backdrop-blur-xl border border-cyan-500/30 rounded-lg p-6 space-y-6">
          {/* Header Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-gradient-to-r from-emerald-950/40 to-cyan-950/40 border border-emerald-500/30 rounded-lg">
              <p className="text-gray-500 text-xs font-mono mb-1">Complaint ID</p>
              <p className="text-emerald-400 font-mono text-sm">#{selectedComplaint.id}</p>
            </div>
            <div className="p-4 bg-gradient-to-r from-emerald-950/40 to-cyan-950/40 border border-emerald-500/30 rounded-lg">
              <p className="text-gray-500 text-xs font-mono mb-1">Status</p>
              <Select
                value={selectedComplaint.status || "submitted"}
                onValueChange={(value) => handleStatusUpdate(selectedComplaint.id, value)}
              >
                <SelectTrigger
                  className={`w-full text-xs font-mono border ${getStatusBadgeColor(
                    selectedComplaint.status || "submitted"
                  )}`}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-900 border-cyan-500/40">
                  <SelectItem value="submitted" className="font-mono text-blue-400">
                    Submitted
                  </SelectItem>
                  <SelectItem value="under_review" className="font-mono text-yellow-400">
                    Under Review
                  </SelectItem>
                  <SelectItem value="resolved" className="font-mono text-green-400">
                    Resolved
                  </SelectItem>
                  <SelectItem value="closed" className="font-mono text-gray-400">
                    Closed
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Wallet Address */}
          <div>
            <p className="text-gray-500 text-xs font-mono mb-2">Wallet Address</p>
            <p className="text-gray-100 font-mono text-sm break-all bg-black/40 p-3 rounded border border-emerald-500/30">
              {selectedComplaint.wallet_address}
            </p>
          </div>

          {/* Officer Details */}
          <div>
            <p className="text-gray-500 text-xs font-mono mb-2">Officer/Designation</p>
            <p className="text-cyan-400 font-mono text-sm mb-3">{selectedComplaint.officer_designation}</p>
            {selectedComplaint.officer_address && (
              <div className="mb-2">
                <p className="text-gray-500 text-xs font-mono mb-1">Address</p>
                <p className="text-gray-300 font-mono text-sm">{selectedComplaint.officer_address}</p>
              </div>
            )}
            {selectedComplaint.officer_email && selectedComplaint.officer_email.length > 0 && (
              <div className="mb-2">
                <p className="text-gray-500 text-xs font-mono mb-1">Email</p>
                <div className="flex flex-wrap gap-2">
                  {selectedComplaint.officer_email.map((email: string, idx: number) => (
                    <a
                      key={idx}
                      href={`mailto:${email}`}
                      className="text-cyan-400 hover:text-cyan-300 font-mono text-sm underline"
                    >
                      {email}
                    </a>
                  ))}
                </div>
              </div>
            )}
            {selectedComplaint.officer_mobile && selectedComplaint.officer_mobile.length > 0 && (
              <div className="mb-2">
                <p className="text-gray-500 text-xs font-mono mb-1">Mobile</p>
                <div className="flex flex-wrap gap-2">
                  {selectedComplaint.officer_mobile.map((mobile: string, idx: number) => (
                    <a
                      key={idx}
                      href={`tel:${mobile}`}
                      className="text-emerald-400 hover:text-emerald-300 font-mono text-sm"
                    >
                      {mobile}
                    </a>
                  ))}
                </div>
              </div>
            )}
            {selectedComplaint.officer_telephone && selectedComplaint.officer_telephone.length > 0 && (
              <div className="mb-2">
                <p className="text-gray-500 text-xs font-mono mb-1">Telephone</p>
                <div className="flex flex-wrap gap-2">
                  {selectedComplaint.officer_telephone.map((tel: string, idx: number) => (
                    <span key={idx} className="text-gray-300 font-mono text-sm">
                      {tel}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Incident Description */}
          <div>
            <p className="text-gray-500 text-xs font-mono mb-2">Incident Description</p>
            <p className="text-gray-300 font-mono text-sm bg-black/40 p-3 rounded border border-emerald-500/30 whitespace-pre-wrap">
              {selectedComplaint.incident_description}
            </p>
          </div>

          {/* Internal Notes */}
          {selectedComplaint.internal_notes && (
            <div>
              <p className="text-gray-500 text-xs font-mono mb-2">Internal Notes</p>
              <p className="text-gray-400 font-mono text-sm bg-black/40 p-3 rounded border border-gray-500/30 whitespace-pre-wrap">
                {selectedComplaint.internal_notes}
              </p>
            </div>
          )}

          {/* Evidence Count */}
          {selectedComplaint.evidence_ids && selectedComplaint.evidence_ids.length > 0 && (
            <div>
              <p className="text-gray-500 text-xs font-mono mb-2">Attached Evidence</p>
              <p className="text-cyan-400 font-mono text-sm">
                {selectedComplaint.evidence_ids.length} file(s) attached
              </p>
            </div>
          )}

          {/* Timestamps */}
          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-700/40">
            <div>
              <p className="text-gray-500 text-xs font-mono mb-1">Created</p>
              <p className="text-gray-300 font-mono text-sm">{formatDate(selectedComplaint.created_at)}</p>
              <p className="text-gray-500 font-mono text-xs">{formatTime(selectedComplaint.created_at)}</p>
            </div>
            <div>
              <p className="text-gray-500 text-xs font-mono mb-1">Last Updated</p>
              <p className="text-gray-300 font-mono text-sm">{formatDate(selectedComplaint.updated_at)}</p>
              <p className="text-gray-500 font-mono text-xs">{formatTime(selectedComplaint.updated_at)}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl space-y-6">
      {/* Header Info */}
      <div className="bg-gradient-to-br from-gray-900/80 to-black/80 backdrop-blur-xl border border-cyan-500/30 rounded-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-gradient-to-br from-cyan-500/20 to-emerald-500/20 rounded-lg border border-cyan-500/30">
            <Clipboard className="w-5 h-5 text-cyan-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg text-cyan-400 font-mono">Complaint History</h3>
            <p className="text-xs text-gray-500 font-mono">Manage and track all filed complaints</p>
          </div>
          <TextToSpeechIconButton
            text="Complaint History. Manage and track all filed complaints. View All Complaints. Browse all filed wallet complaints in one place. Track Status. Monitor complaint status and updates in real-time. Access Details. View full complaint details and officer information."
            className="ml-2"
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-start gap-3 p-4 bg-gradient-to-r from-cyan-950/20 to-emerald-950/20 border border-cyan-500/20 rounded-lg">
            <div className="p-2 bg-cyan-500/10 rounded-lg border border-cyan-500/30">
              <FileText className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-cyan-400 font-mono mb-1">View All Complaints</p>
              <p className="text-xs text-gray-400 font-mono">Browse all filed wallet complaints in one place</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-4 bg-gradient-to-r from-cyan-950/20 to-emerald-950/20 border border-cyan-500/20 rounded-lg">
            <div className="p-2 bg-emerald-500/10 rounded-lg border border-emerald-500/30">
              <Activity className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <p className="text-sm text-emerald-400 font-mono mb-1">Track Status</p>
              <p className="text-xs text-gray-400 font-mono">Monitor complaint status and updates in real-time</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-4 bg-gradient-to-r from-cyan-950/20 to-emerald-950/20 border border-cyan-500/20 rounded-lg">
            <div className="p-2 bg-yellow-500/10 rounded-lg border border-yellow-500/30">
              <Eye className="w-4 h-4 text-yellow-400" />
            </div>
            <div>
              <p className="text-sm text-yellow-400 font-mono mb-1">Access Details</p>
              <p className="text-xs text-gray-400 font-mono">View full complaint details and officer information</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-gradient-to-br from-gray-900/80 to-black/80 backdrop-blur-xl border border-cyan-500/30 rounded-lg p-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-cyan-400" />
            <span className="text-sm text-cyan-400 font-mono">Filters</span>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <Input
              placeholder="Search wallet address..."
              value={filters.wallet_address}
              onChange={(e) => setFilters({ ...filters, wallet_address: e.target.value })}
              className="w-48 bg-black/60 border-cyan-500/40 text-gray-100 placeholder:text-gray-600 focus:border-cyan-400 font-mono text-sm"
            />

            <Select
              value={filters.status}
              onValueChange={(value) => setFilters({ ...filters, status: value })}
            >
              <SelectTrigger className="w-40 bg-black/60 border-cyan-500/40 text-gray-100 font-mono text-sm">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="bg-gray-900 border-cyan-500/40">
                <SelectItem value="all" className="font-mono">All Status</SelectItem>
                <SelectItem value="submitted" className="font-mono text-blue-400">Submitted</SelectItem>
                <SelectItem value="under_review" className="font-mono text-yellow-400">Under Review</SelectItem>
                <SelectItem value="resolved" className="font-mono text-green-400">Resolved</SelectItem>
                <SelectItem value="closed" className="font-mono text-gray-400">Closed</SelectItem>
              </SelectContent>
            </Select>

            <Button
              onClick={fetchComplaints}
              className="flex items-center gap-2 bg-gradient-to-r from-cyan-950/40 to-emerald-950/40 border border-cyan-500/30 hover:border-cyan-500/60 text-cyan-400 hover:text-cyan-300 font-mono text-sm"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* Complaints Table */}
      <div className="bg-gradient-to-br from-gray-900/80 to-black/80 backdrop-blur-xl border border-cyan-500/30 rounded-lg p-6">
        <div className="flex items-center gap-2 mb-6">
          <Clipboard className="w-5 h-5 text-cyan-400" />
          <h3 className="text-lg text-cyan-400 font-mono">Filed Complaints</h3>
          <span className="px-2 py-1 bg-cyan-950/40 border border-cyan-500/30 text-cyan-400 text-xs rounded font-mono">
            {filteredComplaints.length} {filteredComplaints.length === 1 ? "complaint" : "complaints"}
          </span>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-cyan-500/30">
                <th className="text-left py-3 px-4 text-sm text-cyan-400 font-mono">Complaint ID</th>
                <th className="text-left py-3 px-4 text-sm text-cyan-400 font-mono">Wallet Address</th>
                <th className="text-left py-3 px-4 text-sm text-cyan-400 font-mono">Officer/Designation</th>
                <th className="text-left py-3 px-4 text-sm text-cyan-400 font-mono">Status</th>
                <th className="text-left py-3 px-4 text-sm text-cyan-400 font-mono">Created</th>
                <th className="text-left py-3 px-4 text-sm text-cyan-400 font-mono">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="w-8 h-8 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin"></div>
                      <p className="text-gray-500 font-mono text-sm">Loading complaints...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredComplaints.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="p-4 bg-gradient-to-br from-cyan-500/10 to-emerald-500/10 rounded-lg border border-cyan-500/20">
                        <Clipboard className="w-12 h-12 text-gray-600" />
                      </div>
                      <p className="text-gray-500 font-mono text-sm">No complaints found</p>
                      <p className="text-gray-600 text-xs font-mono">File a complaint to see it here</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredComplaints.map((complaint) => (
                  <tr
                    key={complaint.id}
                    className="border-b border-cyan-500/10 hover:bg-cyan-950/10 transition-colors"
                  >
                    <td className="py-4 px-4">
                      <span className="text-emerald-400 font-mono text-sm">#{complaint.id}</span>
                    </td>
                    <td className="py-4 px-4">
                      <div className="font-mono text-sm text-gray-300 break-all max-w-xs">
                        {complaint.wallet_address}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="font-mono text-sm text-gray-300 max-w-xs truncate">
                        {complaint.officer_designation}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span
                        className={`px-2 py-1 rounded font-mono text-xs border ${getStatusBadgeColor(
                          complaint.status || "submitted"
                        )}`}
                      >
                        {complaint.status || "submitted"}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <div className="text-sm text-gray-400 font-mono">{formatDate(complaint.created_at)}</div>
                      <div className="text-xs text-gray-600 font-mono">{formatTime(complaint.created_at)}</div>
                    </td>
                    <td className="py-4 px-4">
                      <Button
                        onClick={() => handleViewComplaint(complaint)}
                        className="px-3 py-1.5 bg-gradient-to-r from-cyan-950/40 to-emerald-950/40 border border-cyan-500/30 hover:border-cyan-500/60 text-cyan-400 hover:text-cyan-300 rounded transition-all font-mono text-xs"
                      >
                        View Details
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function ResetPasswordSection() {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const [investigatorEmail, setInvestigatorEmail] = useState<string>("");

  useEffect(() => {
    // Get logged-in investigator email from localStorage
    const email = localStorage.getItem("investigator_email") || localStorage.getItem("admin_email") || "";
    setInvestigatorEmail(email);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setResult(null);

    // Validation
    if (!investigatorEmail || !oldPassword || !newPassword || !confirmPassword) {
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
      const authHeaders = getAuthHeaders();
      if (!("Authorization" in authHeaders)) {
        setResult({
          success: false,
          message: "Your session has expired. Please login again and retry password reset.",
        });
        setLoading(false);
        return;
      }

      const response = await fetch(apiUrl("investigators/reset-password"), {
        method: "POST",
        headers: {
          ...authHeaders,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: investigatorEmail.trim(),
          old_password: oldPassword,
          new_password: newPassword,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        setResult({
          success: true,
          message: "Password reset successfully! Please login again with your new password."
        });
        // Clear form
        setOldPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        const detail =
          typeof data?.detail === "string"
            ? data.detail
            : Array.isArray(data?.detail)
              ? data.detail.map((d: any) => d?.msg || JSON.stringify(d)).join(", ")
              : undefined;
        setResult({
          success: false,
          message: detail || data.message || "Failed to reset password",
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
    <div className="max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent mb-2">
            Reset Password
          </h1>
          <p className="text-gray-500 font-mono text-sm">Change your account password</p>
        </div>
      </div>

      {/* Reset Password Form */}
      <div className="bg-gradient-to-br from-gray-900/80 to-black/80 backdrop-blur-xl border border-emerald-500/20 rounded-lg p-6">
        <div className="flex items-center gap-3 mb-6">
          <KeyRound className="w-5 h-5 text-emerald-400" />
          <h2 className="text-lg text-emerald-400 font-mono">Change Password</h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Email (read-only) */}
          <div>
            <Label htmlFor="email" className="text-gray-300 font-mono mb-2 block">
              Email Address
            </Label>
            <Input
              id="email"
              type="email"
              value={investigatorEmail}
              disabled
              className="bg-black/60 border-emerald-500/40 text-gray-400 font-mono cursor-not-allowed"
            />
          </div>

          {/* Old Password */}
          <div>
            <Label htmlFor="oldPassword" className="text-gray-300 font-mono mb-2 block">
              Current Password
            </Label>
            <div className="relative">
              <Input
                id="oldPassword"
                type={showOldPassword ? "text" : "password"}
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                placeholder="Enter your current password"
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
            disabled={loading || !investigatorEmail}
            className="w-full relative overflow-hidden bg-gradient-to-r from-emerald-600 via-cyan-600 to-emerald-600 hover:from-emerald-500 hover:via-cyan-500 hover:to-emerald-500 text-white shadow-lg shadow-emerald-500/30 transition-all duration-300 h-12 group/btn border border-emerald-400/30 disabled:opacity-50"
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
  );
}

function NotificationBell({
  investigatorId,
  unreadCount,
  onViewMessages
}: {
  investigatorId: number;
  unreadCount: number;
  onViewMessages: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [recentMessages, setRecentMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, right: 0 });
  const bellRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isOpen && investigatorId) {
      fetchRecentMessages();
      // Calculate dropdown position
      if (buttonRef.current) {
        const rect = buttonRef.current.getBoundingClientRect();
        setDropdownPosition({
          top: rect.bottom + 8, // 8px = mt-2 equivalent
          right: window.innerWidth - rect.right,
        });
      }
    }
  }, [isOpen, investigatorId]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        bellRef.current &&
        !bellRef.current.contains(target) &&
        !(target as Element).closest('[class*="z-[9999]"]')
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      // Small delay to prevent immediate close on open
      setTimeout(() => {
        document.addEventListener("mousedown", handleClickOutside);
      }, 0);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const fetchRecentMessages = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("investigator_token") || localStorage.getItem("access_token");
      const headers: HeadersInit = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      const response = await fetch(
        apiUrl(`messages/investigators/${investigatorId}/messages?limit=5`),
        { headers }
      );
      if (response.ok) {
        const data = await response.json();
        const messages = Array.isArray(data) ? data : (data.messages || []);
        setRecentMessages(messages);
        
        // Auto-read unread messages
        const unreadMessages = messages.filter((msg: any) => !msg.is_read);
        if (unreadMessages.length > 0) {
          const latestUnread = unreadMessages[0];
          const notificationText = `New ${latestUnread.is_broadcast ? 'announcement' : 'message'}: ${latestUnread.subject}. ${latestUnread.content.substring(0, 100)}`;
          ttsService.speakNotification(notificationText);
        }
      }
    } catch (error) {
      console.error("Error fetching recent messages:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatTimeAgo = (dateString: string | null) => {
    if (!dateString) return "Just now";
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) return "Just now";
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays < 7) return `${diffDays}d ago`;
      return date.toLocaleDateString();
    } catch {
      return "Unknown";
    }
  };

  return (
    <>
      <div className="relative" ref={bellRef}>
        <button
          ref={buttonRef}
          onClick={() => setIsOpen(!isOpen)}
          className="relative p-2 text-gray-400 hover:text-purple-400 transition hover:bg-purple-500/10 rounded-lg border border-transparent hover:border-purple-500/30"
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-xs text-white font-bold border-2 border-black">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      </div>

      {isOpen && createPortal(
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-[9998]"
            onClick={() => setIsOpen(false)}
          />
          {/* Dropdown */}
          <div
            className="fixed w-80 bg-gradient-to-br from-gray-900/95 to-black/95 backdrop-blur-xl border border-purple-500/30 rounded-lg shadow-2xl z-[9999] overflow-hidden"
            style={{
              top: `${dropdownPosition.top}px`,
              right: `${dropdownPosition.right}px`,
            }}
          >
            <div className="p-4 border-b border-purple-500/20 bg-gradient-to-r from-purple-950/30 to-cyan-950/30">
              <div className="flex items-center justify-between">
                <h3 className="text-purple-400 font-mono text-sm font-semibold">Notifications</h3>
                <button
                  onClick={onViewMessages}
                  className="text-xs text-cyan-400 hover:text-cyan-300 font-mono underline"
                >
                  View All
                </button>
              </div>
            </div>

            <div className="max-h-96 overflow-y-auto">
              {loading ? (
                <div className="p-8 flex flex-col items-center gap-2">
                  <div className="w-6 h-6 border-2 border-purple-400/30 border-t-purple-400 rounded-full animate-spin" />
                  <p className="text-gray-500 font-mono text-xs">Loading...</p>
                </div>
              ) : recentMessages.length === 0 ? (
                <div className="p-8 flex flex-col items-center gap-2">
                  <Bell className="w-8 h-8 text-gray-600" />
                  <p className="text-gray-500 font-mono text-sm">No notifications</p>
                </div>
              ) : (
                <div className="divide-y divide-purple-500/10">
                  {recentMessages.map((message) => (
                    <div
                      key={message.id}
                      className={`p-4 hover:bg-purple-500/5 transition cursor-pointer ${!message.is_read ? "bg-purple-950/10" : ""
                        }`}
                      onClick={() => {
                        onViewMessages();
                        setIsOpen(false);
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`p-1.5 rounded-lg border ${message.is_read
                            ? "bg-purple-500/10 border-purple-500/30"
                            : "bg-purple-500/20 border-purple-500/40"
                          }`}>
                          {message.is_broadcast ? (
                            <Bell className={`w-3.5 h-3.5 ${message.is_read ? "text-purple-400" : "text-purple-300"}`} />
                          ) : (
                            <Mail className={`w-3.5 h-3.5 ${message.is_read ? "text-purple-400" : "text-purple-300"}`} />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            {!message.is_read && (
                              <span className="w-1.5 h-1.5 bg-purple-400 rounded-full"></span>
                            )}
                            <p className={`text-sm font-mono truncate ${message.is_read ? "text-gray-300" : "text-purple-300 font-semibold"
                              }`}>
                              {message.subject}
                            </p>
                          </div>
                          <p className="text-gray-400 text-xs font-mono line-clamp-2 mb-1">
                            {message.content}
                          </p>
                          <p className="text-gray-600 text-xs font-mono">
                            {formatTimeAgo(message.created_at)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {recentMessages.length > 0 && (
              <div className="p-3 border-t border-purple-500/20 bg-black/40">
                <button
                  onClick={() => {
                    onViewMessages();
                    setIsOpen(false);
                  }}
                  className="w-full text-center text-xs text-purple-400 hover:text-purple-300 font-mono py-2"
                >
                  View All Messages →
                </button>
              </div>
            )}
          </div>
        </>,
        document.body
      )}
    </>
  );
}

function MessagesSection({ investigatorId, onMarkAsRead }: { investigatorId: number; onMarkAsRead: () => void }) {
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMessage, setSelectedMessage] = useState<any | null>(null);
  const [filter, setFilter] = useState<"all" | "unread" | "read">("all");
  const [replying, setReplying] = useState(false);
  const [replyContent, setReplyContent] = useState("");
  const [replyPriority, setReplyPriority] = useState("normal");

  useEffect(() => {
    fetchMessages();
  }, [investigatorId, filter]);

  const fetchMessages = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("investigator_token") || localStorage.getItem("access_token");
      const headers: HeadersInit = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      const response = await fetch(
        apiUrl(`messages/investigators/${investigatorId}/messages?unread_only=${filter === "unread"}`),
        { headers }
      );
      if (response.ok) {
        const data = await response.json();
        // Backend returns array directly, not wrapped in {messages: []}
        setMessages(Array.isArray(data) ? data : (data.messages || []));
      }
    } catch (error) {
      console.error("Error fetching messages:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (messageId: number) => {
    try {
      const token = localStorage.getItem("investigator_token") || localStorage.getItem("access_token");
      const headers: HeadersInit = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      const response = await fetch(
        apiUrl(`messages/messages/${messageId}/read`),
        { method: "PATCH", headers }
      );
      if (response.ok) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === messageId ? { ...msg, is_read: true, read_at: new Date().toISOString() } : msg
          )
        );
        onMarkAsRead();
      }
    } catch (error) {
      console.error("Error marking message as read:", error);
    }
  };

  const handleReply = async () => {
    if (!selectedMessage || !replyContent.trim()) {
      alert("Please enter a reply message");
      return;
    }

    setReplying(true);
    try {
      const token = localStorage.getItem("investigator_token") || localStorage.getItem("access_token");
      const headers: HeadersInit = { "Content-Type": "application/json" };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      const response = await fetch(
        apiUrl(`messages/investigators/${investigatorId}/reply?message_id=${selectedMessage.id}`),
        {
          method: "POST",
          headers,
          body: JSON.stringify({
            content: replyContent,
            priority: replyPriority,
            message_type: "message",
            subject: `Re: ${selectedMessage.subject}`,
            is_broadcast: false
          }),
        }
      );

      if (response.ok) {
        alert("Reply sent successfully!");
        setReplyContent("");
        setReplying(false);
        setSelectedMessage(null);
        fetchMessages();
      } else {
        const error = await response.json();
        alert(`Failed to send reply: ${error.detail || "Unknown error"}`);
      }
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    } finally {
      setReplying(false);
    }
  };

  const filteredMessages = messages.filter((msg) => {
    if (filter === "unread") return !msg.is_read;
    if (filter === "read") return msg.is_read;
    return true;
  });

  const getPriorityColor = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case "urgent":
        return "text-red-400 bg-red-950/20 border-red-500/30";
      case "high":
        return "text-orange-400 bg-orange-950/20 border-orange-500/30";
      case "normal":
        return "text-emerald-400 bg-emerald-950/20 border-emerald-500/30";
      case "low":
        return "text-gray-400 bg-gray-950/20 border-gray-500/30";
      default:
        return "text-gray-400 bg-gray-950/20 border-gray-500/30";
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    try {
      const date = new Date(dateString);
      return date.toLocaleString();
    } catch {
      return dateString;
    }
  };

  return (
    <div className="max-w-6xl space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-br from-gray-900/80 to-black/80 backdrop-blur-xl border border-purple-500/30 rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-purple-500/20 to-cyan-500/20 rounded-lg border border-purple-500/30">
              <Mail className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <h3 className="text-lg text-purple-400 font-mono">Messages & Notifications</h3>
              <p className="text-xs text-gray-500 font-mono">Communications from superadmin</p>
            </div>
          </div>
          <Button
            onClick={fetchMessages}
            variant="outline"
            size="sm"
            className="border-purple-500/40 text-purple-400 hover:bg-purple-500/10"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-gradient-to-br from-gray-900/80 to-black/80 backdrop-blur-xl border border-purple-500/30 rounded-lg p-4">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-500" />
          <span className="text-gray-400 font-mono text-sm mr-4">Filter:</span>
          {(["all", "unread", "read"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg font-mono text-sm transition-all ${filter === f
                  ? "bg-purple-500/20 border border-purple-500/40 text-purple-400"
                  : "bg-black/40 border border-gray-700/30 text-gray-400 hover:text-purple-400"
                }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)} ({f === "all" ? messages.length : f === "unread" ? messages.filter(m => !m.is_read).length : messages.filter(m => m.is_read).length})
            </button>
          ))}
        </div>
      </div>

      {/* Messages List */}
      <div className="bg-gradient-to-br from-gray-900/80 to-black/80 backdrop-blur-xl border border-purple-500/30 rounded-lg p-6">
        {loading ? (
          <div className="py-12 flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-purple-400/30 border-t-purple-400 rounded-full animate-spin" />
            <p className="text-gray-500 font-mono text-sm">Loading messages...</p>
          </div>
        ) : filteredMessages.length === 0 ? (
          <div className="py-12 flex flex-col items-center gap-3">
            <Mail className="w-12 h-12 text-gray-600" />
            <p className="text-gray-500 font-mono">No messages found</p>
            <p className="text-xs text-gray-600 font-mono">
              {filter !== "all" ? "Try changing the filter" : "You have no messages yet"}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredMessages.map((message) => (
              <div
                key={message.id}
                className={`p-4 bg-black/40 border rounded-lg hover:border-opacity-60 transition-all cursor-pointer ${message.is_read
                    ? "border-purple-500/20 hover:border-purple-500/40"
                    : "border-purple-500/40 hover:border-purple-500/60 bg-purple-950/10"
                  }`}
                onClick={() => {
                  setSelectedMessage(message);
                  if (!message.is_read) {
                    handleMarkAsRead(message.id);
                  }
                }}
              >
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg border ${message.is_read
                      ? "bg-purple-500/10 border-purple-500/30"
                      : "bg-purple-500/20 border-purple-500/40"
                    }`}>
                    {message.is_broadcast ? (
                      <Bell className={`w-4 h-4 ${message.is_read ? "text-purple-400" : "text-purple-300"}`} />
                    ) : (
                      <Mail className={`w-4 h-4 ${message.is_read ? "text-purple-400" : "text-purple-300"}`} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {!message.is_read && (
                        <span className="w-2 h-2 bg-purple-400 rounded-full"></span>
                      )}
                      <span className={`font-mono text-sm ${message.is_read ? "text-gray-300" : "text-purple-300 font-semibold"}`}>
                        {message.subject}
                      </span>
                      <span className={`px-2 py-0.5 text-xs font-mono rounded border ${getPriorityColor(message.priority)}`}>
                        {message.priority?.toUpperCase() || "NORMAL"}
                      </span>
                      {message.is_broadcast && (
                        <span className="px-2 py-0.5 text-xs font-mono bg-yellow-950/40 border border-yellow-500/30 rounded text-yellow-400">
                          BROADCAST
                        </span>
                      )}
                    </div>
                    <p className="text-gray-400 text-xs font-mono mb-2 line-clamp-2">
                      {message.content}
                    </p>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500 font-mono">
                        From: {message.sender_email || "System"}
                      </span>
                      <span className="text-gray-600 font-mono">
                        {formatDate(message.created_at)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <TextToSpeechIconButton
                      text={`${message.is_broadcast ? 'Broadcast' : 'Message'} from ${message.sender_email || 'System'}: ${message.subject}. ${message.content}`}
                      className="mr-1"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-purple-500/40 text-purple-400 hover:bg-purple-500/10"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedMessage(message);
                        if (!message.is_read) {
                          handleMarkAsRead(message.id);
                        }
                      }}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Message Detail Modal */}
      {selectedMessage && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gradient-to-br from-gray-900/95 to-black/95 backdrop-blur-xl border border-purple-500/30 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gray-900/95 backdrop-blur-xl border-b border-purple-500/30 p-6 flex items-center justify-between">
              <div className="flex-1">
                <h3 className="text-xl text-purple-400 font-mono mb-1">{selectedMessage.subject}</h3>
                <p className="text-gray-500 font-mono text-sm">
                  From: {selectedMessage.sender_email || "System"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <TextToSpeechIconButton
                  text={`${selectedMessage.is_broadcast ? 'Broadcast message' : 'Message'} from ${selectedMessage.sender_email || 'System'}. Subject: ${selectedMessage.subject}. ${selectedMessage.content}`}
                  className="mr-2"
                />
                <Button
                  onClick={() => setSelectedMessage(null)}
                  className="h-8 w-8 p-0 bg-red-950/20 hover:bg-red-950/40 border border-red-500/30 text-red-400"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-2">
                <span className={`px-3 py-1 text-xs font-mono rounded border ${getPriorityColor(selectedMessage.priority)}`}>
                  {selectedMessage.priority?.toUpperCase() || "NORMAL"}
                </span>
                {selectedMessage.is_broadcast && (
                  <span className="px-3 py-1 text-xs font-mono bg-yellow-950/40 border border-yellow-500/30 rounded text-yellow-400">
                    BROADCAST MESSAGE
                  </span>
                )}
                <span className="text-gray-500 font-mono text-xs">
                  {formatDate(selectedMessage.created_at)}
                </span>
              </div>
              <div className="bg-black/40 border border-purple-500/30 rounded-lg p-4">
                <p className="text-gray-200 font-mono text-sm whitespace-pre-wrap">
                  {selectedMessage.content}
                </p>
              </div>
              {selectedMessage.read_at && (
                <div className="text-gray-500 font-mono text-xs">
                  Read at: {formatDate(selectedMessage.read_at)}
                </div>
              )}
            </div>
            <div className="sticky bottom-0 bg-gray-900/95 backdrop-blur-xl border-t border-purple-500/30 p-4 space-y-4">
              {/* Reply Section */}
              <div className="space-y-2">
                <label className="text-sm text-purple-400 font-mono">Reply:</label>
                <Textarea
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  placeholder="Type your reply..."
                  className="bg-black/40 border-purple-500/30 text-gray-300 font-mono min-h-[100px]"
                />
                <div className="flex items-center gap-2">
                  <label className="text-xs text-gray-400 font-mono">Priority:</label>
                  <select
                    value={replyPriority}
                    onChange={(e) => setReplyPriority(e.target.value)}
                    className="px-3 py-1 bg-black/40 border border-purple-500/30 rounded text-gray-300 font-mono text-xs"
                  >
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  onClick={() => {
                    setSelectedMessage(null);
                    setReplyContent("");
                  }}
                  variant="outline"
                  className="border-gray-500/30 text-gray-400 hover:bg-gray-500/10"
                >
                  Close
                </Button>
                <Button
                  onClick={handleReply}
                  disabled={replying || !replyContent.trim()}
                  className="bg-purple-600 hover:bg-purple-500 text-white border border-purple-500/30"
                >
                  {replying ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Send Reply
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Investigator Self-Service Dashboard Component
function InvestigatorSelfServiceDashboard({ investigatorId }: { investigatorId: number }) {
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  
  // Status Update state
  const [status, setStatus] = useState<string>("available");
  const [statusLoading, setStatusLoading] = useState(false);
  const [statusSuccess, setStatusSuccess] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);

  const fetchDashboard = async () => {
    if (!investigatorId) {
      setError("Investigator ID not available");
      setLoading(false);
      return;
    }

    try {
      const token = localStorage.getItem("investigator_token") || localStorage.getItem("access_token");
      const headers: HeadersInit = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await fetch(apiUrl(`investigators/${investigatorId}/dashboard`), {
        headers,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Dashboard fetch error:", response.status, errorText);
        throw new Error(`Failed to fetch dashboard data: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      console.log("Dashboard data received:", data);
      
      // Validate data structure
      if (!data || !data.stats) {
        console.error("Invalid dashboard data structure:", data);
        throw new Error("Invalid dashboard data structure - missing stats");
      }
      
      // Ensure all required stats fields exist
      const validatedData = {
        ...data,
        stats: {
          total_complaints: data.stats?.total_complaints ?? 0,
          active_complaints: data.stats?.active_complaints ?? 0,
          total_reports: data.stats?.total_reports ?? 0,
          active_reports: data.stats?.active_reports ?? 0,
          total_evidence: data.stats?.total_evidence ?? 0,
          unread_messages: data.stats?.unread_messages ?? 0,
          recent_complaints: data.stats?.recent_complaints ?? 0,
          recent_reports: data.stats?.recent_reports ?? 0,
          recent_evidence: data.stats?.recent_evidence ?? 0,
        },
        investigator: data.investigator || {},
        recent_activity: data.recent_activity || [],
        charts: data.charts || {
          activity_trend: [],
          complaint_status_distribution: [],
          report_status_distribution: [],
          risk_level_distribution: [],
          activity_breakdown: { complaints: 0, reports: 0, evidence: 0 }
        }
      };
      
      console.log("Validated dashboard data:", validatedData);
      setDashboardData(validatedData);
      
      // Set current status from investigator data
      if (validatedData.investigator?.availability_status) {
        setStatus(validatedData.investigator.availability_status);
      }
      
      setError(null);
    } catch (err: any) {
      console.error("Error fetching dashboard:", err);
      setError(err.message || "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async () => {
    if (!investigatorId) return;
    
    setStatusLoading(true);
    setStatusError(null);
    setStatusSuccess(false);

    try {
      const token = localStorage.getItem("investigator_token") || localStorage.getItem("access_token");
      const headers: HeadersInit = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await fetch(apiUrl(`investigators/${investigatorId}/status?status=${status}`), {
        method: "PATCH",
        headers,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to update status");
      }

      setStatusSuccess(true);
      setTimeout(() => setStatusSuccess(false), 3000);
      
      // Refresh dashboard to get updated status
      await fetchDashboard();
    } catch (err: any) {
      setStatusError(err.message || "Failed to update status");
    } finally {
      setStatusLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, [investigatorId]);

  const handleRefresh = async () => {
    setRefreshing(true);
    setLoading(true);
    await fetchDashboard();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-950/40 border border-red-500/50 rounded-lg p-4">
        <p className="text-red-400 font-mono">{error}</p>
        {investigatorId && (
          <p className="text-xs text-gray-500 font-mono mt-2">Investigator ID: {investigatorId}</p>
        )}
        <button
          onClick={handleRefresh}
          className="mt-4 px-4 py-2 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 rounded-lg font-mono text-sm hover:bg-emerald-500/30 transition"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-400 mx-auto mb-4" />
          <p className="text-gray-400 font-mono">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const { investigator, stats, recent_activity } = dashboardData;
  
  // Safe access with defaults
  const safeStats = stats || {
    total_complaints: 0,
    active_complaints: 0,
    total_reports: 0,
    active_reports: 0,
    total_evidence: 0,
    unread_messages: 0,
    recent_complaints: 0,
    recent_reports: 0,
    recent_evidence: 0
  };

  return (
    <div className="max-w-6xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 rounded-lg border border-emerald-500/30">
            <BarChart3 className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-2xl text-emerald-400 font-mono">My Dashboard</h2>
            <p className="text-sm text-gray-500 font-mono">Personal statistics and activity overview</p>
          </div>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing || loading}
          className="p-2 text-gray-400 hover:text-emerald-400 transition hover:bg-emerald-500/10 rounded-lg disabled:opacity-50"
          title="Refresh dashboard"
        >
          <RefreshCw className={`w-5 h-5 ${refreshing ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-gray-900/80 to-black/80 backdrop-blur-xl border border-emerald-500/30 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-400 font-mono">Total Complaints</p>
            <Clipboard className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl text-emerald-400 font-mono">{safeStats.total_complaints}</p>
          <p className="text-xs text-gray-500 font-mono mt-1">{safeStats.active_complaints} active</p>
        </div>

        <div className="bg-gradient-to-br from-gray-900/80 to-black/80 backdrop-blur-xl border border-cyan-500/30 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-400 font-mono">AI Reports</p>
            <Brain className="w-4 h-4 text-cyan-400" />
          </div>
          <p className="text-2xl text-cyan-400 font-mono">{safeStats.total_reports}</p>
          <p className="text-xs text-gray-500 font-mono mt-1">{safeStats.active_reports} active</p>
        </div>

        <div className="bg-gradient-to-br from-gray-900/80 to-black/80 backdrop-blur-xl border border-purple-500/30 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-400 font-mono">Evidence Files</p>
            <Upload className="w-4 h-4 text-purple-400" />
          </div>
          <p className="text-2xl text-purple-400 font-mono">{safeStats.total_evidence}</p>
          <p className="text-xs text-gray-500 font-mono mt-1">{safeStats.recent_evidence} this week</p>
        </div>

        <div className="bg-gradient-to-br from-gray-900/80 to-black/80 backdrop-blur-xl border border-yellow-500/30 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-400 font-mono">Unread Messages</p>
            <Mail className="w-4 h-4 text-yellow-400" />
          </div>
          <p className="text-2xl text-yellow-400 font-mono">{safeStats.unread_messages}</p>
          <p className="text-xs text-gray-500 font-mono mt-1">New notifications</p>
        </div>
      </div>

      {/* Status Update Section */}
      <div className="bg-gradient-to-br from-gray-900/80 to-black/80 backdrop-blur-xl border border-emerald-500/30 rounded-lg p-6">
        <h3 className="text-lg text-emerald-400 font-mono mb-4 flex items-center gap-2">
          <Activity className="w-5 h-5" />
          Availability Status
        </h3>
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { value: "available", label: "Available", selectedClass: "bg-emerald-500/20 border-emerald-500/40 text-emerald-400", icon: CheckCircle, iconClass: "text-emerald-400" },
              { value: "busy", label: "Busy", selectedClass: "bg-yellow-500/20 border-yellow-500/40 text-yellow-400", icon: Activity, iconClass: "text-yellow-400" },
              { value: "away", label: "Away", selectedClass: "bg-orange-500/20 border-orange-500/40 text-orange-400", icon: Clock, iconClass: "text-orange-400" },
              { value: "offline", label: "Offline", selectedClass: "bg-gray-500/20 border-gray-500/40 text-gray-400", icon: XCircle, iconClass: "text-gray-400" },
            ].map((option) => {
              const Icon = option.icon;
              const isSelected = status === option.value;
              const currentStatus = dashboardData?.investigator?.availability_status || "available";
              const isCurrent = currentStatus === option.value;
              
              return (
                <button
                  key={option.value}
                  onClick={() => setStatus(option.value)}
                  className={`p-4 rounded-lg border transition-all relative ${
                    isSelected
                      ? option.selectedClass
                      : "bg-black/40 border-gray-500/20 text-gray-400 hover:border-gray-500/40"
                  }`}
                >
                  <Icon className="w-6 h-6 mx-auto mb-2" />
                  <p className="font-mono text-sm">{option.label}</p>
                  {isCurrent && (
                    <div className="absolute top-2 right-2">
                      <CheckCircle className={`w-4 h-4 ${option.iconClass}`} />
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {statusError && (
            <div className="bg-red-950/40 border border-red-500/50 rounded-lg p-4">
              <p className="text-red-400 font-mono text-sm">{statusError}</p>
            </div>
          )}

          {statusSuccess && (
            <div className="bg-emerald-950/40 border border-emerald-500/50 rounded-lg p-4">
              <p className="text-emerald-400 font-mono text-sm">Status updated successfully!</p>
            </div>
          )}

          <Button
            onClick={handleStatusUpdate}
            disabled={statusLoading || status === (dashboardData?.investigator?.availability_status || "available")}
            className="w-full bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white font-mono"
          >
            {statusLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Updating...
              </>
            ) : (
              <>
                <Activity className="w-4 h-4 mr-2" />
                Update Status
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Visualizations Section */}
      {dashboardData?.charts && Object.keys(dashboardData.charts).length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Activity Trend Chart */}
          {dashboardData.charts.activity_trend && dashboardData.charts.activity_trend.length > 0 && (
            <div className="bg-gradient-to-br from-gray-900/80 to-black/80 backdrop-blur-xl border border-emerald-500/30 rounded-lg p-6">
              <h3 className="text-lg text-emerald-400 font-mono mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Activity Trend (Last 30 Days)
              </h3>
              <p className="text-xs text-gray-500 font-mono mb-4">
                Daily activity breakdown showing complaints, AI reports, and evidence uploads
              </p>
              <ChartContainer
                config={{
                  complaints: { label: "Complaints", color: "hsl(142, 76%, 36%)" },
                  reports: { label: "AI Reports", color: "hsl(199, 89%, 48%)" },
                  evidence: { label: "Evidence", color: "hsl(262, 83%, 58%)" },
                  total: { label: "Total", color: "hsl(45, 93%, 47%)" },
                }}
                className="h-[300px]"
              >
                <AreaChart data={dashboardData.charts.activity_trend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis 
                    dataKey="day" 
                    stroke="#9ca3af"
                    style={{ fontSize: "11px" }}
                    interval="preserveStartEnd"
                    tick={{ fill: "#9ca3af" }}
                  />
                  <YAxis 
                    stroke="#9ca3af"
                    style={{ fontSize: "11px" }}
                    tick={{ fill: "#9ca3af" }}
                    allowDecimals={false}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Area 
                    type="monotone" 
                    dataKey="complaints" 
                    stackId="1" 
                    stroke="#10b981" 
                    fill="#10b981" 
                    fillOpacity={0.6}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="reports" 
                    stackId="1" 
                    stroke="#06b6d4" 
                    fill="#06b6d4" 
                    fillOpacity={0.6}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="evidence" 
                    stackId="1" 
                    stroke="#a855f7" 
                    fill="#a855f7" 
                    fillOpacity={0.6}
                  />
                </AreaChart>
              </ChartContainer>
              {/* Legend */}
              <div className="flex items-center justify-center gap-6 mt-4 pt-4 border-t border-emerald-500/20">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-emerald-500"></div>
                  <span className="text-xs text-gray-400 font-mono">Complaints</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-cyan-500"></div>
                  <span className="text-xs text-gray-400 font-mono">AI Reports</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-purple-500"></div>
                  <span className="text-xs text-gray-400 font-mono">Evidence</span>
                </div>
              </div>
            </div>
          )}

          {/* Activity Breakdown Pie Chart */}
          {dashboardData.charts.activity_breakdown && (
            <div className="bg-gradient-to-br from-gray-900/80 to-black/80 backdrop-blur-xl border border-cyan-500/30 rounded-lg p-6">
              <h3 className="text-lg text-cyan-400 font-mono mb-4 flex items-center gap-2">
                <Target className="w-5 h-5" />
                Activity Breakdown
              </h3>
              <ChartContainer
                config={{
                  complaints: { label: "Complaints", color: "hsl(45, 93%, 47%)" },
                  reports: { label: "AI Reports", color: "hsl(199, 89%, 48%)" },
                  evidence: { label: "Evidence", color: "hsl(262, 83%, 58%)" },
                }}
                className="h-[300px]"
              >
                <PieChart>
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Pie
                    data={[
                      { name: "Complaints", value: dashboardData.charts.activity_breakdown.complaints || 0 },
                      { name: "AI Reports", value: dashboardData.charts.activity_breakdown.reports || 0 },
                      { name: "Evidence", value: dashboardData.charts.activity_breakdown.evidence || 0 },
                    ]}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    <Cell fill="#eab308" />
                    <Cell fill="#06b6d4" />
                    <Cell fill="#a855f7" />
                  </Pie>
                </PieChart>
              </ChartContainer>
            </div>
          )}

          {/* Complaint Status Distribution */}
          {dashboardData.charts.complaint_status_distribution && dashboardData.charts.complaint_status_distribution.length > 0 && (
            <div className="bg-gradient-to-br from-gray-900/80 to-black/80 backdrop-blur-xl border border-yellow-500/30 rounded-lg p-6">
              <h3 className="text-lg text-yellow-400 font-mono mb-4 flex items-center gap-2">
                <Clipboard className="w-5 h-5" />
                Complaint Status Distribution
              </h3>
              <ChartContainer
                config={{
                  count: { label: "Count", color: "hsl(45, 93%, 47%)" },
                }}
                className="h-[300px]"
              >
                <BarChart data={dashboardData.charts.complaint_status_distribution}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis 
                    dataKey="status" 
                    stroke="#9ca3af"
                    style={{ fontSize: "12px" }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis 
                    stroke="#9ca3af"
                    style={{ fontSize: "12px" }}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="count" fill="#eab308" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ChartContainer>
            </div>
          )}

          {/* Report Status Distribution */}
          {dashboardData.charts.report_status_distribution && dashboardData.charts.report_status_distribution.length > 0 && (
            <div className="bg-gradient-to-br from-gray-900/80 to-black/80 backdrop-blur-xl border border-cyan-500/30 rounded-lg p-6">
              <h3 className="text-lg text-cyan-400 font-mono mb-4 flex items-center gap-2">
                <Brain className="w-5 h-5" />
                Report Status Distribution
              </h3>
              <ChartContainer
                config={{
                  count: { label: "Count", color: "hsl(199, 89%, 48%)" },
                }}
                className="h-[300px]"
              >
                <BarChart data={dashboardData.charts.report_status_distribution}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis 
                    dataKey="status" 
                    stroke="#9ca3af"
                    style={{ fontSize: "12px" }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis 
                    stroke="#9ca3af"
                    style={{ fontSize: "12px" }}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="count" fill="#06b6d4" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ChartContainer>
            </div>
          )}

          {/* Risk Level Distribution */}
          {dashboardData.charts.risk_level_distribution && dashboardData.charts.risk_level_distribution.length > 0 && (
            <div className="bg-gradient-to-br from-gray-900/80 to-black/80 backdrop-blur-xl border border-red-500/30 rounded-lg p-6">
              <h3 className="text-lg text-red-400 font-mono mb-4 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Risk Level Distribution
              </h3>
              <ChartContainer
                config={{
                  low: { label: "Low", color: "hsl(142, 76%, 36%)" },
                  medium: { label: "Medium", color: "hsl(45, 93%, 47%)" },
                  high: { label: "High", color: "hsl(0, 84%, 60%)" },
                  critical: { label: "Critical", color: "hsl(0, 72%, 51%)" },
                }}
                className="h-[300px]"
              >
                <BarChart data={dashboardData.charts.risk_level_distribution}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis 
                    dataKey="risk_level" 
                    stroke="#9ca3af"
                    style={{ fontSize: "12px" }}
                  />
                  <YAxis 
                    stroke="#9ca3af"
                    style={{ fontSize: "12px" }}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                    {dashboardData.charts.risk_level_distribution.map((entry: any, index: number) => {
                      const risk = entry.risk_level?.toLowerCase() || "";
                      let color = "#10b981";
                      if (risk === "critical") color = "#dc2626";
                      else if (risk === "high") color = "#ef4444";
                      else if (risk === "medium") color = "#eab308";
                      return <Cell key={`cell-${index}`} fill={color} />;
                    })}
                  </Bar>
                </BarChart>
              </ChartContainer>
            </div>
          )}
        </div>
      )}

      {/* Recent Activity */}
      <div className="bg-gradient-to-br from-gray-900/80 to-black/80 backdrop-blur-xl border border-emerald-500/30 rounded-lg p-6">
        <h3 className="text-lg text-emerald-400 font-mono mb-4">Recent Activity</h3>
        <div className="space-y-3">
          {recent_activity && recent_activity.length > 0 ? (
            recent_activity.map((activity: any, index: number) => (
              <div
                key={index}
                className="flex items-center gap-3 p-3 bg-black/40 border border-emerald-500/20 rounded-lg hover:border-emerald-500/40 transition-all"
              >
                <div className={`p-2 rounded-lg ${
                  activity.type === "complaint" ? "bg-yellow-500/20 border border-yellow-500/30" :
                  activity.type === "report" ? "bg-cyan-500/20 border border-cyan-500/30" :
                  "bg-purple-500/20 border border-purple-500/30"
                }`}>
                  {activity.type === "complaint" ? <Clipboard className="w-4 h-4 text-yellow-400" /> :
                   activity.type === "report" ? <Brain className="w-4 h-4 text-cyan-400" /> :
                   <Upload className="w-4 h-4 text-purple-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-300 font-mono">{activity.title}</p>
                  <p className="text-xs text-gray-500 font-mono">
                    {activity.timestamp ? new Date(activity.timestamp).toLocaleString() : "Unknown time"}
                  </p>
                </div>
                <div className={`px-2 py-1 rounded text-xs font-mono ${
                  activity.status === "completed" || activity.status === "anchored" ? "bg-emerald-500/20 text-emerald-400" :
                  activity.status === "investigating" || activity.status === "under_review" ? "bg-yellow-500/20 text-yellow-400" :
                  "bg-gray-500/20 text-gray-400"
                }`}>
                  {activity.status}
                </div>
              </div>
            ))
          ) : (
            <p className="text-gray-500 font-mono text-center py-8">No recent activity</p>
          )}
        </div>
      </div>

    </div>
  );
}
