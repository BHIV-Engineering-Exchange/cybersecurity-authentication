import { Activity, Users, AlertTriangle, FolderOpen, TrendingUp, Shield, Database, Zap, MapPin, Bot, Filter, Trash2, Eye, Lock, Unlock, FileWarning, PlayCircle, ChevronDown, FileText, Clock, RefreshCw, Loader2, Bell, Brain, CheckCheck, Upload } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { ThreatMap } from "./ThreatMap";
import { useState, useEffect, useRef } from "react";
import { ttsService } from "@/utils/textToSpeech";
import { TextToSpeechIconButton } from "../ui/TextToSpeechButton";

import { apiUrl } from "@/lib/api";
interface ComplaintLocation {
  city: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
  count: number;
}

interface DashboardStats {
  totalComplaints: number;
  totalInvestigators: number;
  totalEvidence: number;
  totalEscalations: number;
  activeCases: number;
  recentComplaints: number;
  totalWallets: number;
  frozenWallets: number;
  fraudTransactions: number;
  normalTransactions: number;
  fraudDetectionAccuracy: number;
}

interface ActivityEvent {
  id: number | string;
  timestamp: string | null;
  actor_id: number | null;
  actor_email: string | null;
  type: string;
  raw_action: string;
  entity_type: string | null;
  entity_id: string | number | null;
  summary: string;
  severity: string;
  ip_address?: string | null;
  is_ai?: boolean;
}

interface NotificationItem {
  id: string;
  type: string;
  severity: string;
  title: string;
  message: string;
  entity_type: string | null;
  entity_id: string | number | null;
  created_at: string | null;
  read: boolean;
  pinned: boolean;
}

interface RiskTrendsByDay {
  date: string;
  critical: number;
  high: number;
  medium: number;
  low: number;
}

interface RiskTrendsRegion {
  region: string;
  critical: number;
  high: number;
}

interface RiskTrendsData {
  by_day: RiskTrendsByDay[];
  distribution: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
  by_region: RiskTrendsRegion[];
}

export function DashboardContent() {
  const [showMLResults, setShowMLResults] = useState(true);
  const [riskFilter, setRiskFilter] = useState("all");
  const [violationFilter, setViolationFilter] = useState("all");
  const [walletAddress, setWalletAddress] = useState("");
  const [reportReason, setReportReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [complaintLocations, setComplaintLocations] = useState<ComplaintLocation[]>([]);
  const [activeWalletInvestigations, setActiveWalletInvestigations] = useState<any[]>([]);
  const [freezeUnfreezeNotifications, setFreezeUnfreezeNotifications] = useState<any[]>([]);
  const [recentAIAnalysis, setRecentAIAnalysis] = useState<any[]>([]);
  const [activityEvents, setActivityEvents] = useState<ActivityEvent[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [riskTrends, setRiskTrends] = useState<RiskTrendsData | null>(null);
  const prevNotificationsRef = useRef<Set<string>>(new Set());
  const [stats, setStats] = useState<DashboardStats>({
    totalComplaints: 0,
    totalInvestigators: 0,
    totalEvidence: 0,
    totalEscalations: 0,
    activeCases: 0,
    recentComplaints: 0,
    totalWallets: 0,
    frozenWallets: 0,
    fraudTransactions: 0,
    normalTransactions: 0,
    fraudDetectionAccuracy: 0,
  });

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const adminToken = localStorage.getItem("admin_token") || localStorage.getItem("access_token");
      const authHeaders: HeadersInit = {};
      if (adminToken) {
        authHeaders["Authorization"] = `Bearer ${adminToken}`;
      }

      // Fetch complaints with locations
      const complaintsRes = await fetch(apiUrl("complaints/"), { headers: authHeaders });
      let complaints: any[] = [];
      if (complaintsRes.ok) {
        complaints = await complaintsRes.json();
      }

      // Fetch investigators
      const investigatorsRes = await fetch(apiUrl("investigators/investigators"), { headers: authHeaders });
      let investigators: any[] = [];
      if (investigatorsRes.ok) {
        const invData = await investigatorsRes.json();
        investigators = invData.investigators || [];
      }

      // Fetch evidence
      const evidenceRes = await fetch(apiUrl("evidence/"), { headers: authHeaders });
      let evidence: any[] = [];
      if (evidenceRes.ok) {
        evidence = await evidenceRes.json();
      }

      // Fetch wallets
      const walletsRes = await fetch(apiUrl("wallets/"), { headers: authHeaders });
      let wallets: any[] = [];
      if (walletsRes.ok) {
        wallets = await walletsRes.json();
      }

      // Fetch freeze/unfreeze lists from dedicated enforcement endpoints
      let frozenWalletRows: any[] = [];
      let unfrozenWalletRows: any[] = [];
      try {
        const [frozenRes, unfrozenRes] = await Promise.all([
          fetch(apiUrl("wallets/frozen/list"), { headers: authHeaders }),
          fetch(apiUrl("wallets/unfrozen/list"), { headers: authHeaders }),
        ]);

        if (frozenRes.ok) {
          frozenWalletRows = await frozenRes.json();
        }
        if (unfrozenRes.ok) {
          unfrozenWalletRows = await unfrozenRes.json();
        }
      } catch (e) {
        console.error("Error fetching freeze/unfreeze wallet lists:", e);
      }

      // Dashboard-level activity feed
      try {
        const activityRes = await fetch(apiUrl("dashboard/activity-feed?limit=50"), { headers: authHeaders });
        if (activityRes.ok) {
          const activityData = await activityRes.json();
          setActivityEvents(activityData.events || []);
        }
      } catch (e) {
        console.error("Error fetching activity feed:", e);
      }

      // Dashboard-level notifications
      try {
        const notifRes = await fetch(apiUrl("dashboard/notifications?limit=50"), {
          headers: authHeaders
        });
        if (notifRes.ok) {
          const notifData = await notifRes.json();
          const newNotifications = notifData.notifications || [];
          setNotifications(newNotifications);
          
          // Auto-read new unread notifications
          const unreadNotifications = newNotifications.filter((n: NotificationItem) => !n.read);
          const newUnreadIds = new Set<string>(unreadNotifications.map((n: NotificationItem) => String(n.id)));
          const trulyNew = unreadNotifications.filter((n: NotificationItem) => !prevNotificationsRef.current.has(String(n.id)));
          
          if (trulyNew.length > 0) {
            const latest = trulyNew[0];
            const notificationText = `New ${latest.severity} ${latest.type} notification: ${latest.title}. ${latest.message.substring(0, 100)}`;
            ttsService.speakNotification(notificationText);
          }
          
          // Update previous notifications set
          prevNotificationsRef.current = newUnreadIds;
        }
      } catch (e) {
        console.error("Error fetching notifications:", e);
      }

      // Dashboard risk trends
      try {
        const trendsRes = await fetch(apiUrl("dashboard/risk-trends?days=30"), { headers: authHeaders });
        if (trendsRes.ok) {
          const trendsData = await trendsRes.json();
          setRiskTrends(trendsData);
        }
      } catch (e) {
        console.error("Error fetching risk trends:", e);
      }

      // Process freeze/unfreeze notifications.
      // Prefer dedicated endpoints; fallback to wallet list shape for backward compatibility.
      const notifications: any[] = [];
      if (frozenWalletRows.length > 0 || unfrozenWalletRows.length > 0) {
        frozenWalletRows.forEach((wallet: any) => {
          notifications.push({
            id: `freeze-${wallet.id}`,
            type: "freeze",
            walletAddress: wallet.address,
            reason: wallet.freeze_reason || "No reason provided",
            actionBy: wallet.frozen_by || "Unknown",
            timestamp: wallet.frozen_at,
            riskLevel: wallet.risk_level || "medium",
            riskScore: wallet.risk_score || 0,
          });
        });

        unfrozenWalletRows.forEach((wallet: any) => {
          notifications.push({
            id: `unfreeze-${wallet.id}`,
            type: "unfreeze",
            walletAddress: wallet.address,
            reason: wallet.unfreeze_reason || "No reason provided",
            actionBy: wallet.unfrozen_by || "Unknown",
            timestamp: wallet.unfrozen_at,
            riskLevel: wallet.risk_level || "medium",
            riskScore: wallet.risk_score || 0,
          });
        });
      } else {
        wallets.forEach((wallet: any) => {
          if (wallet.frozen_at) {
            notifications.push({
              id: `freeze-${wallet.id}`,
              type: "freeze",
              walletAddress: wallet.address,
              reason: wallet.freeze_reason || "No reason provided",
              actionBy: wallet.frozen_by || "Unknown",
              timestamp: wallet.frozen_at,
              riskLevel: wallet.risk_level || "medium",
              riskScore: wallet.risk_score || 0,
            });
          }
          if (wallet.unfrozen_at) {
            notifications.push({
              id: `unfreeze-${wallet.id}`,
              type: "unfreeze",
              walletAddress: wallet.address,
              reason: wallet.unfreeze_reason || "No reason provided",
              actionBy: wallet.unfrozen_by || "Unknown",
              timestamp: wallet.unfrozen_at,
              riskLevel: wallet.risk_level || "medium",
              riskScore: wallet.risk_score || 0,
            });
          }
        });
      }

      // Sort by timestamp (most recent first) and limit to 10
      notifications.sort((a, b) => {
        const dateA = new Date(a.timestamp).getTime();
        const dateB = new Date(b.timestamp).getTime();
        return dateB - dateA;
      });

      setFreezeUnfreezeNotifications(notifications.slice(0, 10));

      // Fetch incident reports for active investigations (superadmin sees all)
      const reportsRes = await fetch(apiUrl("incidents/reports?limit=10"), {
        headers: authHeaders,
      });
      let reports: any[] = [];
      if (reportsRes.ok) {
        reports = await reportsRes.json();
      }

      // Process recent AI analysis notifications - only real reports with valid data
      const aiAnalysisNotifications = reports
        .filter((report: any) => {
          // Filter out placeholder/test data
          // Only include reports with valid wallet addresses and risk scores
          return report.wallet_address &&
            report.wallet_address.length > 10 && // Valid wallet address
            report.risk_score !== null &&
            report.risk_score !== undefined &&
            report.created_at; // Must have creation date
        })
        .map((report: any) => {
          const investigator = report.investigator_id
            ? investigators.find((inv: any) => inv.id === report.investigator_id)
            : null;

          // Parse detected patterns if it's a string
          let detectedPatterns = report.detected_patterns || [];
          if (typeof detectedPatterns === 'string') {
            try {
              detectedPatterns = JSON.parse(detectedPatterns);
            } catch {
              detectedPatterns = [];
            }
          }
          if (!Array.isArray(detectedPatterns)) {
            detectedPatterns = [];
          }

          return {
            id: report.id || report._id,
            walletAddress: report.wallet_address,
            riskScore: report.risk_score || 0,
            riskLevel: report.risk_level || "medium",
            status: report.status || "investigating",
            investigator: investigator ? (investigator.full_name || investigator.email?.split("@")[0] || "Unknown") : "Unknown",
            investigatorId: report.investigator_id,
            createdAt: report.created_at,
            detectedPatterns: detectedPatterns,
            summary: report.summary || {},
          };
        })
        .sort((a: any, b: any) => {
          const dateA = new Date(a.createdAt || 0).getTime();
          const dateB = new Date(b.createdAt || 0).getTime();
          return dateB - dateA;
        })
        .slice(0, 10); // Limit to 10 most recent

      setRecentAIAnalysis(aiAnalysisNotifications);
      // Smart / AI-prioritized queue from dashboard endpoint
      try {
        const pqRes = await fetch(apiUrl("dashboard/priority-queue?limit=20"), { headers: authHeaders });
        if (pqRes.ok) {
          const pqData = await pqRes.json();
          // Transform backend data to match frontend expectations
          const transformedItems = (pqData.items || []).map((item: any) => {
            // Find investigator name
            const investigator = item.investigator_id
              ? investigators.find((inv: any) => inv.id === item.investigator_id)
              : null;

            // Count related complaints and reports
            const complaintsCount = complaints.filter((c: any) => c.wallet_address === item.wallet_address).length;
            const reportsCount = reports.filter((r: any) => r.wallet_address === item.wallet_address).length;

            // Calculate progress (simple heuristic based on status and age)
            let progress = 0;
            if (item.status === "resolved" || item.status === "closed") {
              progress = 100;
            } else if (item.status === "under_review") {
              progress = 60;
            } else if (item.status === "submitted") {
              progress = 30;
            } else {
              progress = 10;
            }

            return {
              id: item.id,
              kind: item.kind,
              address: item.wallet_address,
              walletAddress: item.wallet_address,
              riskScore: item.risk_score || 0,
              riskLevel: (item.risk_level || "MEDIUM").toLowerCase(),
              investigator: investigator ? (investigator.full_name || investigator.email || "Unknown") : "Unknown",
              investigatorId: item.investigator_id,
              complaintsCount,
              reportsCount,
              progress,
              status: item.status,
              priorityScore: item.priority_score || 0,
              recommendedAction: item.recommended_action || "review_later",
            };
          });
          setActiveWalletInvestigations(transformedItems);
        }
      } catch (e) {
        console.error("Error fetching priority queue:", e);
      }

      // Process complaint locations
      const locationMap = new Map<string, ComplaintLocation>();
      complaints.forEach((complaint: any) => {
        if (complaint.investigator_location_latitude && complaint.investigator_location_longitude) {
          const key = `${complaint.investigator_location_latitude},${complaint.investigator_location_longitude}`;
          if (locationMap.has(key)) {
            locationMap.get(key)!.count++;
          } else {
            locationMap.set(key, {
              city: complaint.investigator_location_city,
              country: complaint.investigator_location_country,
              latitude: complaint.investigator_location_latitude,
              longitude: complaint.investigator_location_longitude,
              count: 1,
            });
          }
        }
      });

      setComplaintLocations(Array.from(locationMap.values()));

      // Calculate stats
      const frozenWallets =
        frozenWalletRows.length > 0
          ? frozenWalletRows.length
          : wallets.filter((w: any) => w.is_frozen).length;
      const recentComplaints = complaints.filter((c: any) => {
        const date = new Date(c.created_at);
        const now = new Date();
        const diffDays = (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24);
        return diffDays <= 7;
      }).length;

      // Fetch fraud detection stats
      let fraudStats = { total: 0, fraud: 0, normal: 0, fraud_percentage: 0 };
      try {
        const fraudStatsRes = await fetch(apiUrl("fraud-transactions/stats"), { headers: authHeaders });
        if (fraudStatsRes.ok) {
          fraudStats = await fraudStatsRes.json();
        }
      } catch (e) {
        console.error("Error fetching fraud stats:", e);
      }

      // Fetch model status for accuracy
      let modelAccuracy = 0;
      try {
        const modelStatusRes = await fetch(apiUrl("fraud-predictions/model/status"), { headers: authHeaders });
        if (modelStatusRes.ok) {
          const modelStatus = await modelStatusRes.json();
          if (modelStatus.available && modelStatus.metadata?.metrics?.accuracy) {
            modelAccuracy = modelStatus.metadata.metrics.accuracy * 100;
          }
        }
      } catch (e) {
        console.error("Error fetching model status:", e);
      }

      setStats({
        totalComplaints: complaints.length,
        totalInvestigators: investigators.length,
        totalEvidence: evidence.length,
        totalEscalations: 0, // Will be calculated from escalations endpoint
        activeCases: complaints.filter((c: any) => c.status === "submitted" || c.status === "under_review").length,
        recentComplaints,
        totalWallets: wallets.length,
        frozenWallets,
        fraudTransactions: aiAnalysisNotifications.length,
        normalTransactions: fraudStats.normal,
        fraudDetectionAccuracy: modelAccuracy,
      });
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const mlStats = [
    { label: "Critical", value: "1", color: "red" },
    { label: "High", value: "2", color: "orange" },
    { label: "Medium", value: "1", color: "yellow" },
    { label: "Escalated", value: "3", color: "purple" },
  ];

  const suspiciousWallets = [
    {
      address: "0x742d35...8a2f4e",
      riskScore: 94,
      violationType: "Money Laundering",
      action: "Immediate Freeze",
      details: "Multiple high-value transactions to sanctioned entities",
      analyzed: "5m ago",
      severity: "Critical"
    },
    {
      address: "0x8f3a21...d4c9b7",
      riskScore: 87,
      violationType: "Fraud Detection",
      action: "Monitor & Report",
      details: "Abnormal transaction patterns detected",
      analyzed: "12m ago",
      severity: "High"
    },
    {
      address: "0x1a5d89...f3e2c1",
      riskScore: 89,
      violationType: "Ransomware Payment",
      action: "Escalate to Authorities",
      details: "Linked to known ransomware group",
      analyzed: "18m ago",
      severity: "High"
    },
    {
      address: "0x6c7b45...a9d8f2",
      riskScore: 72,
      violationType: "Tax Evasion",
      action: "Further Investigation",
      details: "Unreported large transactions",
      analyzed: "25m ago",
      severity: "Medium"
    },
  ];


  const filteredWallets = suspiciousWallets.filter(wallet => {
    const riskMatch = riskFilter === "all" || wallet.severity.toLowerCase() === riskFilter.toLowerCase();
    const violationMatch = violationFilter === "all" || wallet.violationType === violationFilter;
    return riskMatch && violationMatch;
  });

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "Critical": return "red";
      case "High": return "orange";
      case "Medium": return "yellow";
      default: return "gray";
    }
  };

  const dashboardStats = [
    {
      label: "Total Complaints",
      value: stats.totalComplaints.toString(),
      change: `+${stats.recentComplaints} this week`,
      icon: FileText,
      color: "emerald"
    },
    {
      label: "Active Cases",
      value: stats.activeCases.toString(),
      change: `${Math.round((stats.activeCases / Math.max(stats.totalComplaints, 1)) * 100)}% active`,
      icon: FolderOpen,
      color: "cyan"
    },
    {
      label: "Evidence Items",
      value: stats.totalEvidence.toString(),
      change: `+${Math.floor(stats.totalEvidence * 0.1)} recent`,
      icon: Database,
      color: "purple"
    },
    {
      label: "Investigators",
      value: stats.totalInvestigators.toString(),
      change: "Active",
      icon: Users,
      color: "blue"
    },
    {
      label: "Recent AI Analysis",
      value: stats.fraudTransactions.toString(),
      change: "Reports generated",
      icon: Brain,
      color: "rose"
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent mb-2">
            Dashboard
          </h1>
          <p className="text-gray-500 font-mono text-sm">System Overview & Analytics</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Notification Center Bell */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setNotificationsOpen(!notificationsOpen)}
              className="relative inline-flex items-center justify-center w-9 h-9 rounded-full border border-emerald-500/40 bg-black/60 text-emerald-400 hover:bg-emerald-900/60 transition-all"
            >
              <Bell className="w-4 h-4" />
              {notifications.filter(n => !n.read).length > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] px-1 rounded-full bg-red-500 text-[10px] font-mono text-white flex items-center justify-center">
                  {notifications.filter(n => !n.read).length > 9 ? "9+" : notifications.filter(n => !n.read).length}
                </span>
              )}
            </button>
          </div>
          <Button
            onClick={fetchDashboardData}
            variant="outline"
            size="sm"
            className="bg-emerald-950/20 border-emerald-500/30 text-emerald-400 hover:bg-emerald-950/40"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <div className="flex items-center gap-2 px-4 py-2 bg-emerald-950/30 border border-emerald-500/30 rounded-lg">
            <Activity className="w-4 h-4 text-emerald-400 animate-pulse" />
            <span className="text-emerald-400 font-mono text-sm">Live</span>
          </div>
        </div>
      </div>

      {/* Notification Center Dropdown */}
      {notificationsOpen && (
        <div className="bg-gradient-to-br from-gray-900/80 to-black/80 backdrop-blur-xl border border-emerald-500/30 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-emerald-400" />
              <h2 className="text-emerald-400 font-mono text-sm">Notification Center</h2>
            </div>
            <div className="flex items-center gap-3">
              {notifications.length > 0 && (
                <button
                  onClick={async () => {
                    try {
                      const adminToken = localStorage.getItem("admin_token");
                      // Update local state to mark all as read
                      setNotifications(prev => prev.map(n => ({ ...n, read: true })));

                      // Call backend to mark as read
                      if (adminToken) {
                        await fetch(apiUrl("dashboard/notifications/mark-all-read"), {
                          method: "POST",
                          headers: {
                            "Authorization": `Bearer ${adminToken}`
                          }
                        });
                        // Refresh to ensure server sync
                        fetchDashboardData();
                      }
                    } catch (error) {
                      console.error("Error marking all as read:", error);
                    }
                  }}
                  className="text-xs font-mono text-cyan-400 hover:text-cyan-300 transition flex items-center gap-1 px-2 py-1 rounded border border-cyan-500/30 hover:border-cyan-500/50 bg-cyan-950/20 hover:bg-cyan-950/40"
                >
                  <CheckCheck className="w-3 h-3" />
                  Mark All Read
                </button>
              )}
              <span className="text-gray-500 font-mono text-xs">
                {notifications.length} notification{notifications.length === 1 ? "" : "s"}
              </span>
            </div>
          </div>
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="text-gray-500 font-mono text-xs py-4 text-center">
                No notifications yet
              </p>
            ) : (
              notifications.map((notif) => {
                const sev = (notif.severity || "info").toLowerCase();
                const sevColor =
                  sev === "critical"
                    ? "red"
                    : sev === "warning" || sev === "warn"
                      ? "yellow"
                      : "cyan";

                let IconComp = Zap;
                if (notif.type === "ai") IconComp = Bot;
                else if (notif.type === "wallet") IconComp = Database;
                else if (notif.type === "complaint") IconComp = FileText;

                return (
                  <div
                    key={notif.id}
                    className={`flex items-start gap-3 p-3 rounded-lg border transition-all ${notif.read
                      ? "bg-black/20 border-emerald-500/5 opacity-60"
                      : "bg-black/40 border-emerald-500/10 hover:border-emerald-500/40"
                      }`}
                  >
                    <div
                      className={`p-2 rounded-lg bg-${sevColor}-500/10 border border-${sevColor}-500/40`}
                    >
                      <IconComp className={`w-3 h-3 text-${sevColor}-400`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-xs font-mono text-gray-200 truncate">
                          {notif.title}
                        </p>
                        <div className="flex items-center gap-2">
                          <TextToSpeechIconButton
                            text={`${notif.severity} ${notif.type} notification: ${notif.title}. ${notif.message || ''}`}
                            className="ml-1"
                          />
                          <span
                            className={`ml-2 px-2 py-0.5 rounded-full text-[10px] font-mono bg-${sevColor}-950/40 text-${sevColor}-400 border border-${sevColor}-500/40`}
                          >
                            {notif.type.toUpperCase()}
                          </span>
                        </div>
                      </div>
                      {notif.message && (
                        <p className="text-[11px] text-gray-500 font-mono line-clamp-2">
                          {notif.message}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {dashboardStats.map((stat, index) => (
          <div
            key={index}
            className="relative group bg-gradient-to-br from-gray-900/80 to-black/80 backdrop-blur-xl border border-emerald-500/20 rounded-lg p-6 hover:border-emerald-500/40 transition-all"
          >
            <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 rounded-lg blur opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <stat.icon className={`w-8 h-8 text-${stat.color}-400`} />
                <span className={`text-xs font-mono px-2 py-1 bg-${stat.color}-950/40 border border-${stat.color}-500/30 rounded text-${stat.color}-400`}>
                  {stat.change}
                </span>
              </div>
              <div className="text-3xl text-gray-100 mb-1">{stat.value}</div>
              <div className="text-sm text-gray-500 font-mono">{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Additional Analysis Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-gray-900/80 to-black/80 backdrop-blur-xl border border-red-500/20 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-2">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            <span className="text-gray-500 font-mono text-sm">Frozen Wallets</span>
          </div>
          <p className="text-3xl font-mono text-red-400">{stats.frozenWallets}</p>
          <p className="text-xs text-gray-600 font-mono mt-1">Out of {stats.totalWallets} total</p>
        </div>
        <div className="bg-gradient-to-br from-gray-900/80 to-black/80 backdrop-blur-xl border border-orange-500/20 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-2">
            <Clock className="w-5 h-5 text-orange-400" />
            <span className="text-gray-500 font-mono text-sm">Recent Complaints</span>
          </div>
          <p className="text-3xl font-mono text-orange-400">{stats.recentComplaints}</p>
          <p className="text-xs text-gray-600 font-mono mt-1">Last 7 days</p>
        </div>
        <div className="bg-gradient-to-br from-gray-900/80 to-black/80 backdrop-blur-xl border border-cyan-500/20 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-2">
            <MapPin className="w-5 h-5 text-cyan-400" />
            <span className="text-gray-500 font-mono text-sm">Locations</span>
          </div>
          <p className="text-3xl font-mono text-cyan-400">{complaintLocations.length}</p>
          <p className="text-xs text-gray-600 font-mono mt-1">Unique complaint locations</p>
        </div>
        <div className="bg-gradient-to-br from-gray-900/80 to-black/80 backdrop-blur-xl border border-purple-500/20 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp className="w-5 h-5 text-purple-400" />
            <span className="text-gray-500 font-mono text-sm">Growth Rate</span>
          </div>
          <p className="text-3xl font-mono text-purple-400">
            {stats.totalComplaints > 0 ? Math.round((stats.recentComplaints / stats.totalComplaints) * 100) : 0}%
          </p>
          <p className="text-xs text-gray-600 font-mono mt-1">Weekly growth</p>
        </div>
      </div>

      {/* Activity Feed & Risk Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Activity Feed */}
        <div className="bg-gradient-to-br from-gray-900/80 to-black/80 backdrop-blur-xl border border-emerald-500/20 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-emerald-400" />
              <h2 className="text-emerald-400 font-mono text-sm">Activity Feed</h2>
            </div>
            <span className="text-gray-600 font-mono text-xs">
              Last {activityEvents.length} events
            </span>
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {activityEvents.length === 0 ? (
              <p className="text-gray-500 font-mono text-xs text-center py-6">
                No recent activity
              </p>
            ) : (
              activityEvents.slice(0, 20).map((event) => {
                const sev = (event.severity || "info").toLowerCase();
                const sevColor =
                  sev === "critical"
                    ? "red"
                    : sev === "warning" || sev === "warn"
                      ? "yellow"
                      : "cyan";

                let IconComp = Zap;
                if (event.type === "wallet") IconComp = Database;
                else if (event.type === "complaint") IconComp = FileText;
                else if (event.type === "evidence") IconComp = Upload;
                else if (event.type === "ai") IconComp = Bot;

                const getTimeAgo = (dateString: string | null) => {
                  if (!dateString) return "Unknown";
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
                  <div
                    key={event.id}
                    className="flex items-start gap-3 p-3 rounded-lg bg-black/40 border border-emerald-500/10 hover:border-emerald-500/40 transition-all"
                  >
                    <div
                      className={`p-2 rounded-lg bg-${sevColor}-500/10 border border-${sevColor}-500/40`}
                    >
                      <IconComp className={`w-3 h-3 text-${sevColor}-400`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-xs font-mono text-gray-200 truncate">
                          {event.raw_action || event.type}
                        </p>
                        <span className="text-[10px] text-gray-500 font-mono">
                          {getTimeAgo(event.timestamp)}
                        </span>
                      </div>
                      {event.summary && (
                        <p className="text-[11px] text-gray-500 font-mono line-clamp-2">
                          {event.summary}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        {event.actor_email && (
                          <span className="text-[10px] text-cyan-400 font-mono truncate max-w-[160px]">
                            {event.actor_email}
                          </span>
                        )}
                        {event.is_ai && (
                          <span className="px-1.5 py-0.5 rounded-full bg-purple-950/40 border border-purple-500/40 text-[9px] font-mono text-purple-300">
                            AI
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Risk Trends */}
        <div className="bg-gradient-to-br from-gray-900/80 to-black/80 backdrop-blur-xl border border-emerald-500/20 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-400" />
              <h2 className="text-emerald-400 font-mono text-sm">Risk Trends (30 days)</h2>
            </div>
          </div>
          {!riskTrends ? (
            <p className="text-gray-500 font-mono text-xs text-center py-6">
              No risk trend data available
            </p>
          ) : (
            <div className="space-y-4">
              {/* Distribution */}
              <div>
                <p className="text-gray-500 font-mono text-xs mb-2">Risk Distribution</p>
                {(["critical", "high", "medium", "low"] as const).map((level) => {
                  const total =
                    riskTrends.distribution.critical +
                    riskTrends.distribution.high +
                    riskTrends.distribution.medium +
                    riskTrends.distribution.low || 1;
                  const value = riskTrends.distribution[level];
                  const pct = Math.round((value / total) * 100);
                  const color =
                    level === "critical"
                      ? "red"
                      : level === "high"
                        ? "orange"
                        : level === "medium"
                          ? "yellow"
                          : "emerald";
                  const label = level.charAt(0).toUpperCase() + level.slice(1);
                  return (
                    <div key={level} className="mb-1">
                      <div className="flex items-center justify-between text-[11px] font-mono mb-1">
                        <span className="text-gray-500">{label}</span>
                        <span className={`text-${color}-400`}>{value} ({pct}%)</span>
                      </div>
                      <div className="w-full h-2 bg-black/60 rounded-full overflow-hidden">
                        <div
                          className={`h-full bg-${color}-500/70`}
                          style={{ width: `${pct}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* High/Critical by day (last 7 days) */}
              <div>
                <p className="text-gray-500 font-mono text-xs mb-2">
                  High & Critical Cases (last 7 days)
                </p>
                <div className="space-y-1">
                  {riskTrends.by_day.slice(-7).map((day) => {
                    const totalHigh =
                      (day.high || 0) + (day.critical || 0);
                    const pct = Math.min(100, totalHigh * 10); // simple scale
                    return (
                      <div key={day.date} className="flex items-center gap-2">
                        <span className="text-[10px] text-gray-600 font-mono w-16">
                          {day.date.slice(5)}
                        </span>
                        <div className="flex-1 h-2 bg-black/60 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-orange-500 to-red-500"
                            style={{ width: `${pct}%` }}
                          ></div>
                        </div>
                        <span className="text-[10px] text-red-400 font-mono w-6 text-right">
                          {totalHigh}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Recent AI Analysis Notifications */}
      <div className="bg-gradient-to-br from-gray-900/80 to-black/80 backdrop-blur-xl border border-purple-500/20 rounded-lg p-6">
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-purple-500/20">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-purple-500/20 to-cyan-500/20 rounded-lg border border-purple-500/30">
              <Bot className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <h2 className="text-purple-400 font-mono">Recent AI Analysis</h2>
              <p className="text-gray-500 text-xs font-mono">Advanced behavioral pattern detection & risk assessment</p>
            </div>
          </div>
          <span className="px-2 py-1 bg-purple-950/40 border border-purple-500/30 text-purple-400 text-xs rounded font-mono">
            {recentAIAnalysis.length} reports
          </span>
        </div>

        <div className="space-y-3 max-h-[600px] overflow-y-auto">
          {recentAIAnalysis.length === 0 ? (
            <div className="py-8 text-center">
              <Bot className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-500 font-mono text-sm">No AI analysis reports yet</p>
              <p className="text-gray-600 font-mono text-xs mt-1">Recent AI analysis results will appear here</p>
            </div>
          ) : (
            recentAIAnalysis.map((analysis) => {
              const getTimeAgo = (dateString: string) => {
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

              const getRiskColor = (level: string) => {
                switch (level?.toLowerCase()) {
                  case "critical":
                    return "red";
                  case "high":
                    return "orange";
                  case "medium":
                    return "yellow";
                  case "low":
                    return "emerald";
                  default:
                    return "gray";
                }
              };
              const riskColor = getRiskColor(analysis.riskLevel);

              const detectedPatterns = Array.isArray(analysis.detectedPatterns)
                ? analysis.detectedPatterns
                : (typeof analysis.detectedPatterns === 'string'
                  ? JSON.parse(analysis.detectedPatterns || '[]')
                  : []);

              return (
                <div
                  key={analysis.id}
                  className="p-4 bg-black/40 border border-purple-500/20 rounded-lg hover:border-purple-500/40 transition-all group"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-purple-500/10 rounded-lg border border-purple-500/30">
                      <Bot className="w-4 h-4 text-purple-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-cyan-400 font-mono text-sm truncate" title={analysis.walletAddress}>
                          {analysis.walletAddress}
                        </span>
                        <span className={`px-2 py-0.5 text-xs font-mono bg-${riskColor}-950/40 border border-${riskColor}-500/30 rounded text-${riskColor}-400`}>
                          {analysis.riskLevel.toUpperCase()}
                        </span>
                        <span className={`text-${riskColor}-400 font-mono text-xs`}>
                          Score: {analysis.riskScore}
                        </span>
                      </div>

                      <div className="mb-2">
                        {analysis.investigator && analysis.investigator !== "Unknown" && (
                          <p className="text-gray-400 text-xs font-mono mb-1">
                            Investigator: <span className="text-emerald-400">{analysis.investigator}</span>
                          </p>
                        )}
                        {detectedPatterns.length > 0 ? (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {detectedPatterns.slice(0, 3).map((pattern: string, idx: number) => (
                              <span
                                key={idx}
                                className="px-2 py-0.5 text-xs font-mono bg-purple-950/40 border border-purple-500/30 rounded text-purple-400"
                              >
                                {pattern}
                              </span>
                            ))}
                            {detectedPatterns.length > 3 && (
                              <span className="px-2 py-0.5 text-xs font-mono text-gray-500">
                                +{detectedPatterns.length - 3} more
                              </span>
                            )}
                          </div>
                        ) : (
                          <p className="text-gray-500 text-xs font-mono mt-1">No patterns detected</p>
                        )}
                      </div>

                      <div className="flex items-center justify-between text-xs">
                        <span className={`px-2 py-0.5 text-xs font-mono rounded ${analysis.status === "active" || analysis.status === "investigating"
                          ? "bg-emerald-950/40 border border-emerald-500/30 text-emerald-400"
                          : analysis.status === "resolved" || analysis.status === "closed"
                            ? "bg-blue-950/40 border border-blue-500/30 text-blue-400"
                            : "bg-gray-950/40 border border-gray-500/30 text-gray-400"
                          }`}>
                          {analysis.status.toUpperCase()}
                        </span>
                        <span className="text-gray-600 font-mono">
                          {getTimeAgo(analysis.createdAt)}
                        </span>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-purple-500/40 text-purple-400 hover:bg-purple-500/10"
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Complaint Locations Threat Map */}
        <div className="bg-gradient-to-br from-gray-900/80 to-black/80 backdrop-blur-xl border border-emerald-500/20 rounded-lg p-6 lg:col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <MapPin className="w-5 h-5 text-red-400" />
            <h2 className="text-emerald-400 font-mono">Filed Complaints Location Map</h2>
            <span className="px-2 py-1 bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 text-xs rounded font-mono">
              {complaintLocations.length} locations
            </span>
          </div>

          <ThreatMap locations={complaintLocations} />
        </div>

        {/* Recent Freeze/Unfreeze Notifications */}
        <div className="bg-gradient-to-br from-gray-900/80 to-black/80 backdrop-blur-xl border border-emerald-500/20 rounded-lg p-6 hover:border-emerald-500/30 transition-all">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-emerald-500/10">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-orange-500/20 to-red-500/20 rounded-lg border border-orange-500/30">
                <Bell className="w-5 h-5 text-orange-400" />
              </div>
              <div>
                <h2 className="text-emerald-400 font-mono">Recent Freeze/Unfreeze Updates</h2>
                <p className="text-gray-600 text-xs font-mono">Wallet enforcement notifications</p>
              </div>
            </div>
            <span className="px-2 py-1 bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 text-xs rounded font-mono">
              {freezeUnfreezeNotifications.length}
            </span>
          </div>

          <div className="space-y-3 max-h-[500px] overflow-y-auto">
            {freezeUnfreezeNotifications.length === 0 ? (
              <div className="py-8 text-center">
                <Lock className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-500 font-mono text-sm">No freeze/unfreeze actions yet</p>
                <p className="text-gray-600 font-mono text-xs mt-1">Recent wallet enforcement actions will appear here</p>
              </div>
            ) : (
              freezeUnfreezeNotifications.map((notification) => {
                const isFreeze = notification.type === "freeze";
                const getTimeAgo = (dateString: string) => {
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

                const getRiskColor = (level: string) => {
                  switch (level?.toLowerCase()) {
                    case "critical":
                    case "high":
                      return "red";
                    case "medium":
                      return "yellow";
                    case "low":
                      return "emerald";
                    default:
                      return "gray";
                  }
                };
                const riskColor = getRiskColor(notification.riskLevel);

                return (
                  <div
                    key={notification.id}
                    className={`p-4 bg-black/40 border rounded-lg hover:border-opacity-60 transition-all group ${isFreeze
                      ? "border-red-500/20 hover:border-red-500/40"
                      : "border-emerald-500/20 hover:border-emerald-500/40"
                      }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg border ${isFreeze
                        ? "bg-red-500/10 border-red-500/30"
                        : "bg-emerald-500/10 border-emerald-500/30"
                        }`}>
                        {isFreeze ? (
                          <Lock className={`w-4 h-4 text-red-400`} />
                        ) : (
                          <Unlock className={`w-4 h-4 text-emerald-400`} />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`font-mono text-sm ${isFreeze ? "text-red-400" : "text-emerald-400"
                            }`}>
                            {isFreeze ? "🔒 FROZEN" : "🔓 UNFROZEN"}
                          </span>
                          <span className={`px-2 py-0.5 text-xs font-mono bg-${riskColor}-950/40 border border-${riskColor}-500/30 rounded text-${riskColor}-400`}>
                            {notification.riskLevel.toUpperCase()}
                          </span>
                        </div>
                        <p className="text-cyan-400 font-mono text-sm truncate mb-1" title={notification.walletAddress}>
                          {notification.walletAddress}
                        </p>
                        <p className="text-gray-400 text-xs font-mono mb-2 line-clamp-2">
                          {notification.reason}
                        </p>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-500 font-mono">
                            By: <span className="text-gray-400">{notification.actionBy}</span>
                          </span>
                          <span className="text-gray-600 font-mono">
                            {getTimeAgo(notification.timestamp)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Active Wallet Investigating */}
        <div className="bg-gradient-to-br from-gray-900/80 to-black/80 backdrop-blur-xl border border-emerald-500/20 rounded-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <Database className="w-5 h-5 text-cyan-400" />
            <h2 className="text-emerald-400 font-mono">Active Wallet Investigating</h2>
            <span className="px-2 py-1 bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 text-xs rounded font-mono">
              {activeWalletInvestigations.length} wallets
            </span>
          </div>
          <div className="space-y-3">
            {activeWalletInvestigations.length === 0 ? (
              <div className="py-8 text-center">
                <Database className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-500 font-mono text-sm">No active wallet investigations</p>
                <p className="text-gray-600 font-mono text-xs mt-1">Wallets with active complaints or reports will appear here</p>
              </div>
            ) : (
              activeWalletInvestigations.map((wallet: any, index: number) => {
                const getRiskColor = (level: string) => {
                  switch (level?.toLowerCase()) {
                    case "critical":
                    case "high":
                      return "red";
                    case "medium":
                      return "yellow";
                    case "low":
                      return "emerald";
                    default:
                      return "gray";
                  }
                };
                const riskLevel = wallet.riskLevel || "medium";
                const riskColor = getRiskColor(riskLevel);

                return (
                  <div
                    key={wallet.id || index}
                    className="p-4 bg-black/40 border border-emerald-500/10 rounded-lg hover:border-emerald-500/30 transition-all group"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <span className="text-cyan-400 font-mono text-sm truncate max-w-[200px]" title={wallet.address || wallet.walletAddress}>
                            {wallet.address || wallet.walletAddress || "Unknown"}
                          </span>
                          <span className={`px-2 py-0.5 text-xs font-mono bg-${riskColor}-950/40 border border-${riskColor}-500/30 rounded text-${riskColor}-400`}>
                            {riskLevel.toUpperCase()}
                          </span>
                          {wallet.riskScore > 0 && (
                            <span className="text-gray-500 font-mono text-xs">Score: {wallet.riskScore}</span>
                          )}
                          {wallet.priorityScore > 0 && (
                            <span className="text-purple-400 font-mono text-xs">Priority: {wallet.priorityScore}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 mt-2">
                          <p className="text-gray-600 font-mono text-xs">Investigator: <span className="text-gray-400">{wallet.investigator || "Unassigned"}</span></p>
                          {wallet.complaintsCount > 0 && (
                            <p className="text-gray-600 font-mono text-xs">Complaints: <span className="text-red-400">{wallet.complaintsCount}</span></p>
                          )}
                          {wallet.reportsCount > 0 && (
                            <p className="text-gray-600 font-mono text-xs">Reports: <span className="text-purple-400">{wallet.reportsCount}</span></p>
                          )}
                        </div>
                      </div>
                      <Button size="sm" variant="outline" className="border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10">
                        <Eye className="w-4 h-4" />
                      </Button>
                    </div>
                    <div>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-gray-500 font-mono">Investigation Progress</span>
                        <span className="text-emerald-400 font-mono">{wallet.progress || 0}%</span>
                      </div>
                      <div className="w-full h-2 bg-black/50 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-emerald-400 to-cyan-400 transition-all"
                          style={{ width: `${wallet.progress || 0}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

    </div>
  );
}
