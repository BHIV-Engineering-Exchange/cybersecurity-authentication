import { AlertTriangle, Lock, Unlock, Search, Eye, Download, Shield, ExternalLink, FileText, Calendar, Tag, X, User, MessageSquare } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "../ui/dialog";

import { apiUrl, getAuthHeaders } from "@/lib/api";
interface WalletData {
  wallet: {
    id: number;
    address: string;
    label: string | null;
    risk_level: string;
    is_frozen: boolean;
    frozen_by: string | null;
    freeze_reason: string | null;
    frozen_at: string | null;
    unfrozen_by: string | null;
    unfreeze_reason: string | null;
    unfrozen_at: string | null;
    created_at: string | null;
  };
  risk_score: number;
  ml_tags: string[];
  complaints: any[];
  incident_reports: any[];
  evidence: any[];
  complaints_count: number;
  incident_reports_count: number;
  evidence_count: number;
}

interface FrozenWallet {
  id: number;
  address: string;
  risk_score: number;
  frozen_by: string | null;
  freeze_reason: string | null;
  frozen_at: string | null;
}

interface UnfrozenWallet {
  id: number;
  address: string;
  risk_score: number;
  unfrozen_by: string | null;
  unfreeze_reason: string | null;
  unfrozen_at: string | null;
}

const extractApiErrorMessage = (errorData: any, fallback = "Unknown error") => {
  if (!errorData || typeof errorData !== "object") return fallback;
  return (
    errorData.detail ||
    errorData.message ||
    errorData.error?.message ||
    fallback
  );
};

export function EscalationsContent() {
  const [activeTab, setActiveTab] = useState<"search" | "frozen" | "unfrozen">("search");
  const [searchWallet, setSearchWallet] = useState("");
  const [walletResult, setWalletResult] = useState<WalletData | null>(null);
  const [loading, setLoading] = useState(false);
  const [frozenWallets, setFrozenWallets] = useState<FrozenWallet[]>([]);
  const [unfrozenWallets, setUnfrozenWallets] = useState<UnfrozenWallet[]>([]);
  const [loadingFrozen, setLoadingFrozen] = useState(false);
  const [loadingUnfrozen, setLoadingUnfrozen] = useState(false);
  
  // Freeze/Unfreeze modals
  const [showFreezeModal, setShowFreezeModal] = useState(false);
  const [showUnfreezeModal, setShowUnfreezeModal] = useState(false);
  const [freezeReason, setFreezeReason] = useState("");
  const [unfreezeReason, setUnfreezeReason] = useState("");
  const [freezingWalletId, setFreezingWalletId] = useState<number | null>(null);

  useEffect(() => {
    if (activeTab === "frozen") {
      fetchFrozenWallets();
    } else if (activeTab === "unfrozen") {
      fetchUnfrozenWallets();
    }
  }, [activeTab]);

  const fetchFrozenWallets = async () => {
    setLoadingFrozen(true);
    try {
      const response = await fetch(apiUrl("wallets/frozen/list"), { headers: getAuthHeaders() });
      if (response.ok) {
        const data = await response.json();
        setFrozenWallets(data);
      }
    } catch (error) {
      console.error("Error fetching frozen wallets:", error);
    } finally {
      setLoadingFrozen(false);
    }
  };

  const fetchUnfrozenWallets = async () => {
    setLoadingUnfrozen(true);
    try {
      const response = await fetch(apiUrl("wallets/unfrozen/list"), { headers: getAuthHeaders() });
      if (response.ok) {
        const data = await response.json();
        setUnfrozenWallets(data);
      }
    } catch (error) {
      console.error("Error fetching unfrozen wallets:", error);
    } finally {
      setLoadingUnfrozen(false);
    }
  };

  const handleCheckWallet = async () => {
    if (!searchWallet.trim()) return;
    
    setLoading(true);
    try {
      const response = await fetch(apiUrl(`wallets/search/${encodeURIComponent(searchWallet.trim())}`), { headers: getAuthHeaders() });
      if (response.ok) {
        const data = await response.json();
        setWalletResult(data);
      } else {
        const errorData = await response.json().catch(() => ({}));
        alert(`Failed to search wallet: ${extractApiErrorMessage(errorData)}`);
      }
    } catch (error) {
      console.error("Error searching wallet:", error);
      alert("Failed to search wallet. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleFreezeWallet = async () => {
    if (!freezingWalletId || !freezeReason.trim()) return;
    
    const adminEmail = localStorage.getItem("admin_email") || "superadmin@cybercrime.gov";
    
    try {
      const response = await fetch(apiUrl(`wallets/${freezingWalletId}/freeze`), {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({
          freeze_reason: freezeReason.trim(),
          frozen_by: adminEmail,
        }),
      });
      
      if (response.ok) {
        alert("Wallet frozen successfully!");
        setShowFreezeModal(false);
        setFreezeReason("");
        setFreezingWalletId(null);
        // Refresh wallet data
        if (searchWallet.trim()) {
          handleCheckWallet();
        }
        // Refresh frozen list if on that tab
        if (activeTab === "frozen") {
          fetchFrozenWallets();
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        alert(`Failed to freeze wallet: ${extractApiErrorMessage(errorData)}`);
      }
    } catch (error) {
      console.error("Error freezing wallet:", error);
      alert("Failed to freeze wallet. Please try again.");
    }
  };

  const handleUnfreezeWallet = async (walletId: number) => {
    if (!unfreezeReason.trim()) return;
    
    const adminEmail = localStorage.getItem("admin_email") || "superadmin@cybercrime.gov";
    
    try {
      const response = await fetch(apiUrl(`wallets/${walletId}/unfreeze`), {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({
          unfreeze_reason: unfreezeReason.trim(),
          unfrozen_by: adminEmail,
        }),
      });
      
      if (response.ok) {
        alert("Wallet unfrozen successfully!");
        setShowUnfreezeModal(false);
        setUnfreezeReason("");
        setFreezingWalletId(null);
        // Refresh lists
        fetchFrozenWallets();
        fetchUnfrozenWallets();
        // Refresh wallet data if searching
        if (searchWallet.trim()) {
          handleCheckWallet();
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        alert(`Failed to unfreeze wallet: ${extractApiErrorMessage(errorData)}`);
      }
    } catch (error) {
      console.error("Error unfreezing wallet:", error);
      alert("Failed to unfreeze wallet. Please try again.");
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "—";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-GB", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateString;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl bg-gradient-to-r from-red-400 to-orange-400 bg-clip-text text-transparent mb-2">
            Escalations
          </h1>
          <p className="text-gray-500 font-mono text-sm">Wallet Freeze/Unfreeze Management</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab("search")}
          className={`flex items-center gap-2 px-4 py-3 rounded-lg font-mono text-sm transition-all ${
            activeTab === "search"
              ? "bg-gradient-to-r from-cyan-600/20 to-blue-600/20 border border-cyan-500/40 text-cyan-400"
              : "bg-gray-900/50 border border-gray-700/30 text-gray-500 hover:text-gray-300 hover:border-gray-600/40"
          }`}
        >
          <Search className="w-4 h-4" />
          🔍 Search Wallet
        </button>
        <button
          onClick={() => setActiveTab("frozen")}
          className={`flex items-center gap-2 px-4 py-3 rounded-lg font-mono text-sm transition-all ${
            activeTab === "frozen"
              ? "bg-gradient-to-r from-red-600/20 to-orange-600/20 border border-red-500/40 text-red-400"
              : "bg-gray-900/50 border border-gray-700/30 text-gray-500 hover:text-gray-300 hover:border-gray-600/40"
          }`}
        >
          <Lock className="w-4 h-4" />
          🔒 Frozen Wallets ({frozenWallets.length})
        </button>
        <button
          onClick={() => setActiveTab("unfrozen")}
          className={`flex items-center gap-2 px-4 py-3 rounded-lg font-mono text-sm transition-all ${
            activeTab === "unfrozen"
              ? "bg-gradient-to-r from-emerald-600/20 to-cyan-600/20 border border-emerald-500/40 text-emerald-400"
              : "bg-gray-900/50 border border-gray-700/30 text-gray-500 hover:text-gray-300 hover:border-gray-600/40"
          }`}
        >
          <Unlock className="w-4 h-4" />
          🔓 Unfrozen Wallets ({unfrozenWallets.length})
        </button>
      </div>

      {/* Search Wallet Tab */}
      {activeTab === "search" && (
        <div className="bg-gradient-to-br from-gray-900/80 to-black/80 backdrop-blur-xl border border-cyan-500/20 rounded-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <Search className="w-5 h-5 text-cyan-400" />
            <h2 className="text-cyan-400 font-mono">🔍 Search / Add Wallet</h2>
          </div>
          
          <div className="flex gap-3">
            <Input
              placeholder="Enter Wallet Address (0x...)"
              value={searchWallet}
              onChange={(e) => setSearchWallet(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleCheckWallet();
                }
              }}
              className="flex-1 bg-black/60 border-cyan-500/40 text-gray-100 placeholder:text-gray-600 font-mono text-sm focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 transition-all"
            />
            <Button 
              className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 font-mono shadow-lg shadow-cyan-500/20"
              onClick={handleCheckWallet}
              disabled={loading || !searchWallet.trim()}
            >
              <Search className="w-4 h-4 mr-2" />
              {loading ? "Searching..." : "Check Wallet"}
            </Button>
          </div>

          {/* Wallet Result */}
          {walletResult && (
            <div className="mt-6 space-y-4">
              {/* Wallet Address Card */}
              <div className="bg-gradient-to-br from-black/60 to-gray-900/60 border border-cyan-500/30 rounded-lg p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-cyan-600/20 border border-cyan-500/30 rounded-lg">
                      <Shield className="w-5 h-5 text-cyan-400" />
                    </div>
                    <div>
                      <h3 className="text-cyan-400 font-mono text-sm">Wallet Address</h3>
                      <p className="text-gray-300 font-mono break-all">{walletResult.wallet.address}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {walletResult.wallet.is_frozen && (
                      <span className="px-3 py-1 bg-red-950/40 border border-red-500/30 text-red-400 rounded font-mono text-xs">
                        🔒 FROZEN
                      </span>
                    )}
                    <a 
                      href={`https://etherscan.io/address/${walletResult.wallet.address}`}
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="flex items-center gap-2 px-3 py-2 bg-emerald-600/20 border border-emerald-500/30 rounded-lg text-emerald-400 font-mono text-sm hover:bg-emerald-600/30 transition-all"
                    >
                      <ExternalLink className="w-4 h-4" />
                      View on Explorer
                    </a>
                  </div>
                </div>

                {/* Risk Score and Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                  <div className="p-3 bg-black/40 border border-red-500/20 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="w-4 h-4 text-red-400" />
                      <span className="text-gray-400 font-mono text-xs">Risk Score</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-3 bg-black/50 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-red-500 to-orange-500 transition-all"
                          style={{ width: `${walletResult.risk_score}%` }}
                        ></div>
                      </div>
                      <span className="text-red-400 font-mono">{walletResult.risk_score}</span>
                    </div>
                  </div>

                  <div className="p-3 bg-black/40 border border-emerald-500/20 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="w-4 h-4 text-emerald-400" />
                      <span className="text-gray-400 font-mono text-xs">Complaints</span>
                    </div>
                    <p className="text-emerald-400 font-mono text-lg">{walletResult.complaints_count}</p>
                  </div>

                  <div className="p-3 bg-black/40 border border-cyan-500/20 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="w-4 h-4 text-cyan-400" />
                      <span className="text-gray-400 font-mono text-xs">AI Reports</span>
                    </div>
                    <p className="text-cyan-400 font-mono text-lg">{walletResult.incident_reports_count}</p>
                  </div>

                  <div className="p-3 bg-black/40 border border-purple-500/20 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="w-4 h-4 text-purple-400" />
                      <span className="text-gray-400 font-mono text-xs">Evidence</span>
                    </div>
                    <p className="text-purple-400 font-mono text-lg">{walletResult.evidence_count}</p>
                  </div>
                </div>

                {/* ML Tags */}
                {walletResult.ml_tags.length > 0 && (
                  <div className="mt-4 p-3 bg-black/40 border border-purple-500/20 rounded-lg">
                    <div className="flex items-center gap-2 mb-3">
                      <Tag className="w-4 h-4 text-purple-400" />
                      <span className="text-purple-400 font-mono text-sm">ML Tags / Detected Patterns</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {walletResult.ml_tags.map((tag: string, index: number) => (
                        <span 
                          key={index}
                          className="px-3 py-1 bg-purple-950/40 border border-purple-500/30 rounded-full text-purple-300 font-mono text-xs"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Freeze Status */}
                {walletResult.wallet.is_frozen && walletResult.wallet.freeze_reason && (
                  <div className="mt-4 p-3 bg-red-950/20 border border-red-500/30 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Lock className="w-4 h-4 text-red-400" />
                      <span className="text-red-400 font-mono text-sm">Frozen Status</span>
                    </div>
                    <p className="text-gray-300 font-mono text-sm mb-1">Reason: {walletResult.wallet.freeze_reason}</p>
                    <p className="text-gray-500 font-mono text-xs">
                      Frozen by: {walletResult.wallet.frozen_by} • {formatDate(walletResult.wallet.frozen_at)}
                    </p>
                  </div>
                )}
              </div>

              {/* Filed Complaints */}
              {walletResult.complaints.length > 0 && (
                <div className="bg-gradient-to-br from-black/60 to-gray-900/60 border border-emerald-500/30 rounded-lg p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <FileText className="w-5 h-5 text-emerald-400" />
                    <h3 className="text-emerald-400 font-mono">Filed Complaints ({walletResult.complaints.length})</h3>
                  </div>
                  
                  <div className="space-y-3">
                    {walletResult.complaints.map((complaint: any) => (
                      <div 
                        key={complaint.id} 
                        className="p-4 bg-black/40 border border-emerald-500/20 rounded-lg hover:border-emerald-500/40 transition-all"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="text-gray-300 font-mono text-sm">Complaint #{complaint.id}</p>
                            <p className="text-gray-500 font-mono text-xs mt-1">
                              Officer: {complaint.officer_designation}
                            </p>
                          </div>
                          <span className={`px-2 py-1 text-xs rounded font-mono ${
                            complaint.status === "submitted" ? "bg-blue-950/40 border border-blue-500/30 text-blue-400" :
                            complaint.status === "under_review" ? "bg-yellow-950/40 border border-yellow-500/30 text-yellow-400" :
                            complaint.status === "resolved" ? "bg-green-950/40 border border-green-500/30 text-green-400" :
                            "bg-gray-950/40 border border-gray-500/30 text-gray-400"
                          }`}>
                            {complaint.status.replace("_", " ").toUpperCase()}
                          </span>
                        </div>
                        <p className="text-gray-400 font-mono text-xs line-clamp-2">{complaint.incident_description}</p>
                        {complaint.investigator_location_city && (
                          <p className="text-gray-600 font-mono text-xs mt-1">
                            Investigator Location: {complaint.investigator_location_city}, {complaint.investigator_location_country}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* AI Analysis Reports */}
              {walletResult.incident_reports.length > 0 && (
                <div className="bg-gradient-to-br from-black/60 to-gray-900/60 border border-cyan-500/30 rounded-lg p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <AlertTriangle className="w-5 h-5 text-cyan-400" />
                    <h3 className="text-cyan-400 font-mono">AI Analysis Reports ({walletResult.incident_reports.length})</h3>
                  </div>
                  
                  <div className="space-y-3">
                    {walletResult.incident_reports.map((report: any) => (
                      <div 
                        key={report._id} 
                        className="p-4 bg-black/40 border border-cyan-500/20 rounded-lg hover:border-cyan-500/40 transition-all"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="text-gray-300 font-mono text-sm">Report #{report._id}</p>
                            <div className="flex items-center gap-3 mt-1">
                              <span className={`px-2 py-1 text-xs rounded font-mono ${
                                report.risk_level === "critical" ? "bg-red-950/40 border border-red-500/30 text-red-400" :
                                report.risk_level === "high" ? "bg-orange-950/40 border border-orange-500/30 text-orange-400" :
                                report.risk_level === "medium" ? "bg-yellow-950/40 border border-yellow-500/30 text-yellow-400" :
                                "bg-green-950/40 border border-green-500/30 text-green-400"
                              }`}>
                                {report.risk_level.toUpperCase()}
                              </span>
                              <span className="text-red-400 font-mono text-sm">Risk Score: {report.risk_score}</span>
                            </div>
                          </div>
                          <span className="text-gray-500 font-mono text-xs">{formatDate(report.created_at)}</span>
                        </div>
                        <p className="text-gray-400 font-mono text-xs line-clamp-2">{report.user_description}</p>
                        {report.detected_patterns && report.detected_patterns.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {report.detected_patterns.slice(0, 5).map((pattern: string, idx: number) => (
                              <span key={idx} className="px-2 py-0.5 bg-cyan-950/40 border border-cyan-500/30 text-cyan-400 rounded text-xs font-mono">
                                {pattern}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Evidence Library */}
              {walletResult.evidence.length > 0 && (
                <div className="bg-gradient-to-br from-black/60 to-gray-900/60 border border-emerald-500/30 rounded-lg p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <FileText className="w-5 h-5 text-emerald-400" />
                    <h3 className="text-emerald-400 font-mono">Uploaded Evidence Library ({walletResult.evidence.length})</h3>
                  </div>
                  
                  <div className="space-y-3">
                    {walletResult.evidence.map((evidence: any) => (
                      <div 
                        key={evidence.id} 
                        className="flex items-center justify-between p-4 bg-black/40 border border-emerald-500/20 rounded-lg hover:border-emerald-500/40 transition-all group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-emerald-600/20 border border-emerald-500/30 rounded">
                            <FileText className="w-4 h-4 text-emerald-400" />
                          </div>
                          <div>
                            <p className="text-gray-300 font-mono text-sm">{evidence.title}</p>
                            <div className="flex items-center gap-3 text-xs text-gray-500 font-mono mt-1">
                              <span className="text-cyan-400">{evidence.evidence_id}</span>
                              <span>•</span>
                              <span>Uploaded by {evidence.uploaded_by}</span>
                              <span>•</span>
                              <span>{formatDate(evidence.created_at)}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            variant="outline"
                            className="border-cyan-500/40 text-cyan-400 hover:bg-cyan-500/10 font-mono text-xs opacity-0 group-hover:opacity-100 transition-all"
                          >
                            <Eye className="w-3 h-3 mr-1" />
                            View
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="bg-gradient-to-br from-black/60 to-gray-900/60 border border-orange-500/30 rounded-lg p-5">
                <h3 className="text-orange-400 font-mono mb-4 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  Wallet Actions
                </h3>
                <div className="flex gap-3">
                  {walletResult.wallet.is_frozen ? (
                    <Button 
                      className="flex-1 bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 font-mono shadow-lg shadow-emerald-500/20"
                      onClick={() => {
                        setFreezingWalletId(walletResult.wallet.id);
                        setShowUnfreezeModal(true);
                      }}
                    >
                      <Unlock className="w-4 h-4 mr-2" />
                      Unfreeze Wallet
                    </Button>
                  ) : (
                    <Button 
                      className="flex-1 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 font-mono shadow-lg shadow-red-500/20"
                      onClick={() => {
                        setFreezingWalletId(walletResult.wallet.id);
                        setShowFreezeModal(true);
                      }}
                    >
                      <Lock className="w-4 h-4 mr-2" />
                      Freeze Wallet
                    </Button>
                  )}
                </div>
                <p className="text-orange-400/60 text-xs font-mono mt-3 flex items-start gap-2">
                  <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                  <span>Freezing/unfreezing a wallet requires supervisor approval and is logged in the audit trail</span>
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Frozen Wallets Table */}
      {activeTab === "frozen" && (
        <div className="bg-gradient-to-br from-gray-900/80 to-black/80 backdrop-blur-xl border border-red-500/20 rounded-lg overflow-hidden">
          <div className="p-6 border-b border-red-500/20">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-600/20 border border-red-500/30 rounded-lg">
                  <Lock className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <h2 className="text-red-400 font-mono">🔒 Frozen Wallets</h2>
                  <p className="text-gray-600 text-xs font-mono">{frozenWallets.length} Frozen</p>
                </div>
              </div>
              <Button
                onClick={fetchFrozenWallets}
                className="bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 text-red-400 text-xs font-mono"
              >
                Refresh
              </Button>
            </div>
            <p className="text-gray-600 text-xs font-mono">Wallets temporarily blocked from transacting</p>
          </div>

          <div className="overflow-x-auto">
            {loadingFrozen ? (
              <div className="py-12 flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-2 border-red-400/30 border-t-red-400 rounded-full animate-spin" />
                <p className="text-gray-500 font-mono text-sm">Loading frozen wallets...</p>
              </div>
            ) : frozenWallets.length === 0 ? (
              <div className="py-12 flex flex-col items-center gap-3">
                <Lock className="w-12 h-12 text-gray-600" />
                <p className="text-gray-500 font-mono">No frozen wallets</p>
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-black/40 border-b border-red-500/20">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-mono text-gray-400">Wallet Address</th>
                    <th className="px-6 py-4 text-left text-xs font-mono text-gray-400">Risk Score</th>
                    <th className="px-6 py-4 text-left text-xs font-mono text-gray-400">Frozen By</th>
                    <th className="px-6 py-4 text-left text-xs font-mono text-gray-400">Freeze Reason</th>
                    <th className="px-6 py-4 text-left text-xs font-mono text-gray-400">Frozen At</th>
                    <th className="px-6 py-4 text-left text-xs font-mono text-gray-400">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-red-500/10">
                  {frozenWallets.map((wallet) => (
                    <tr key={wallet.id} className="hover:bg-red-500/5 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Shield className="w-4 h-4 text-red-400" />
                          <span className="text-gray-300 font-mono text-sm">{wallet.address}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 max-w-[80px] h-2 bg-black/50 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-red-500 to-orange-500"
                              style={{ width: `${wallet.risk_score}%` }}
                            ></div>
                          </div>
                          <span className="text-red-400 font-mono text-sm">{wallet.risk_score}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-gray-400 font-mono text-sm">{wallet.frozen_by || "—"}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-gray-500 font-mono text-xs max-w-xs block">{wallet.freeze_reason || "—"}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-gray-500 font-mono text-xs">{formatDate(wallet.frozen_at)}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10 font-mono text-xs"
                            onClick={() => {
                              setFreezingWalletId(wallet.id);
                              setShowUnfreezeModal(true);
                            }}
                          >
                            <Unlock className="w-3 h-3 mr-1" />
                            Unfreeze
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Unfrozen Wallets Table */}
      {activeTab === "unfrozen" && (
        <div className="bg-gradient-to-br from-gray-900/80 to-black/80 backdrop-blur-xl border border-emerald-500/20 rounded-lg overflow-hidden">
          <div className="p-6 border-b border-emerald-500/20">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-600/20 border border-emerald-500/30 rounded-lg">
                  <Unlock className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h2 className="text-emerald-400 font-mono">🔓 Unfrozen Wallets</h2>
                  <p className="text-gray-600 text-xs font-mono">{unfrozenWallets.length} Unfrozen</p>
                </div>
              </div>
              <Button
                onClick={fetchUnfrozenWallets}
                className="bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-400 text-xs font-mono"
              >
                Refresh
              </Button>
            </div>
            <p className="text-gray-600 text-xs font-mono">Wallets that were previously frozen and have been unfrozen</p>
          </div>

          <div className="overflow-x-auto">
            {loadingUnfrozen ? (
              <div className="py-12 flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-2 border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin" />
                <p className="text-gray-500 font-mono text-sm">Loading unfrozen wallets...</p>
              </div>
            ) : unfrozenWallets.length === 0 ? (
              <div className="py-12 flex flex-col items-center gap-3">
                <Unlock className="w-12 h-12 text-gray-600" />
                <p className="text-gray-500 font-mono">No unfrozen wallets</p>
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-black/40 border-b border-emerald-500/20">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-mono text-gray-400">Wallet Address</th>
                    <th className="px-6 py-4 text-left text-xs font-mono text-gray-400">Risk Score</th>
                    <th className="px-6 py-4 text-left text-xs font-mono text-gray-400">Unfrozen By</th>
                    <th className="px-6 py-4 text-left text-xs font-mono text-gray-400">Unfreeze Reason</th>
                    <th className="px-6 py-4 text-left text-xs font-mono text-gray-400">Unfrozen At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-emerald-500/10">
                  {unfrozenWallets.map((wallet) => (
                    <tr key={wallet.id} className="hover:bg-emerald-500/5 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Shield className="w-4 h-4 text-emerald-400" />
                          <span className="text-gray-300 font-mono text-sm">{wallet.address}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 max-w-[80px] h-2 bg-black/50 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500"
                              style={{ width: `${wallet.risk_score}%` }}
                            ></div>
                          </div>
                          <span className="text-emerald-400 font-mono text-sm">{wallet.risk_score}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-gray-400 font-mono text-sm">{wallet.unfrozen_by || "—"}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-gray-500 font-mono text-xs max-w-xs block">{wallet.unfreeze_reason || "—"}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-gray-500 font-mono text-xs">{formatDate(wallet.unfrozen_at)}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Freeze Wallet Modal */}
      <Dialog open={showFreezeModal} onOpenChange={setShowFreezeModal}>
        <DialogContent className="bg-gradient-to-br from-gray-900/95 to-black/95 border border-red-500/30 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-400 font-mono flex items-center gap-2">
              <Lock className="w-5 h-5" />
              Freeze Wallet
            </DialogTitle>
            <DialogDescription className="text-gray-400 font-mono text-sm">
              Provide a reason for freezing this wallet. This action will be logged and requires supervisor approval.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-gray-300 font-mono text-sm mb-2 block">Freeze Reason *</label>
              <Textarea
                placeholder="Enter the reason for freezing this wallet (e.g., High risk ML score, Suspicious activity, etc.)"
                value={freezeReason}
                onChange={(e) => setFreezeReason(e.target.value)}
                className="bg-black/60 border-red-500/40 text-gray-100 placeholder:text-gray-600 font-mono text-sm focus:border-red-400 focus:ring-2 focus:ring-red-400/20 min-h-[100px]"
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowFreezeModal(false);
                setFreezeReason("");
                setFreezingWalletId(null);
              }}
              className="border-gray-700/30 text-gray-400 hover:text-gray-300 font-mono"
            >
              Cancel
            </Button>
            <Button
              onClick={handleFreezeWallet}
              disabled={!freezeReason.trim()}
              className="bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 font-mono"
            >
              <Lock className="w-4 h-4 mr-2" />
              Freeze Wallet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Unfreeze Wallet Modal */}
      <Dialog open={showUnfreezeModal} onOpenChange={setShowUnfreezeModal}>
        <DialogContent className="bg-gradient-to-br from-gray-900/95 to-black/95 border border-emerald-500/30 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-emerald-400 font-mono flex items-center gap-2">
              <Unlock className="w-5 h-5" />
              Unfreeze Wallet
            </DialogTitle>
            <DialogDescription className="text-gray-400 font-mono text-sm">
              Provide a reason for unfreezing this wallet. This action will be logged.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-gray-300 font-mono text-sm mb-2 block">Unfreeze Reason *</label>
              <Textarea
                placeholder="Enter the reason for unfreezing this wallet (e.g., False positive, Investigation cleared, etc.)"
                value={unfreezeReason}
                onChange={(e) => setUnfreezeReason(e.target.value)}
                className="bg-black/60 border-emerald-500/40 text-gray-100 placeholder:text-gray-600 font-mono text-sm focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 min-h-[100px]"
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowUnfreezeModal(false);
                setUnfreezeReason("");
                setFreezingWalletId(null);
              }}
              className="border-gray-700/30 text-gray-400 hover:text-gray-300 font-mono"
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (freezingWalletId) {
                  handleUnfreezeWallet(freezingWalletId);
                }
              }}
              disabled={!unfreezeReason.trim()}
              className="bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 font-mono"
            >
              <Unlock className="w-4 h-4 mr-2" />
              Unfreeze Wallet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
